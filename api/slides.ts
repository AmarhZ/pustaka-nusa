import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/auth';
import { prisma } from './_lib/db';
import { fail, idParam, json } from './_lib/http';
import { dropImage } from './_lib/images';
import { parseSlide } from './_lib/validate';

const MAX_SLIDES = 8;
const select = { id: true, position: true, imageUrl: true, eyebrow: true, title: true, body: true, buttonLabel: true, buttonLink: true } as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (!(await requireAdmin(req, res, { write: req.method !== 'GET' }))) return;

    if (req.method === 'GET') {
      json(res, 200, { slides: await prisma().slide.findMany({ orderBy: { position: 'asc' }, select }) });
      return;
    }
    if (req.method === 'POST') {
      const p = parseSlide(req.body);
      if (!p.ok) { json(res, 400, { error: p.error }); return; }
      if ((await prisma().slide.count()) >= MAX_SLIDES) { json(res, 400, { error: `Maksimal ${MAX_SLIDES} slide` }); return; }
      const last = await prisma().slide.aggregate({ _max: { position: true } });
      const position = (last._max.position ?? 0) + 1;
      json(res, 201, { slide: await prisma().slide.create({ data: { ...p.value, position }, select }) });
      return;
    }
    if (req.method === 'PATCH') { // urutkan ulang: { order: [id, id, ...] }
      const order = (req.body as { order?: unknown } | undefined)?.order;
      if (!Array.isArray(order) || order.length > MAX_SLIDES || !order.every((x) => Number.isInteger(x) && x > 0)) {
        json(res, 400, { error: 'Urutan tidak valid' });
        return;
      }
      await prisma().$transaction((order as number[]).map((id, i) => prisma().slide.update({ where: { id }, data: { position: i + 1 } })));
      json(res, 200, { ok: true });
      return;
    }

    const id = idParam(req.query.id);
    if (id === null) { json(res, 400, { error: 'ID tidak valid' }); return; }

    if (req.method === 'PUT') {
      const p = parseSlide(req.body);
      if (!p.ok) { json(res, 400, { error: p.error }); return; }
      const old = await prisma().slide.findUnique({ where: { id }, select: { imageUrl: true } });
      const slide = await prisma().slide.update({ where: { id }, data: p.value, select });
      if (old && old.imageUrl !== p.value.imageUrl) await dropImage(old.imageUrl);
      json(res, 200, { slide });
      return;
    }
    if (req.method === 'DELETE') {
      if ((await prisma().slide.count()) <= 1) { json(res, 400, { error: 'Minimal harus ada 1 slide' }); return; }
      const old = await prisma().slide.findUnique({ where: { id }, select: { imageUrl: true } });
      await prisma().slide.delete({ where: { id } });
      await dropImage(old?.imageUrl);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 405, { error: 'Method tidak didukung' });
  } catch (err) {
    fail(res, err);
  }
}
