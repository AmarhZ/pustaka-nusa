import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/auth';
import { prisma } from './_lib/db';
import { fail, idParam, json } from './_lib/http';
import { parseBook } from './_lib/validate';

const select = { id: true, title: true, author: true, category: true, year: true, stock: true, isbn: true } as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (!(await requireAdmin(req, res, { write: req.method !== 'GET' }))) return;

    if (req.method === 'GET') {
      json(res, 200, { books: await prisma().book.findMany({ orderBy: { title: 'asc' }, take: 1000, select }) });
      return;
    }
    if (req.method === 'POST') {
      const p = parseBook(req.body);
      if (!p.ok) { json(res, 400, { error: p.error }); return; }
      json(res, 201, { book: await prisma().book.create({ data: p.value, select }) });
      return;
    }
    const id = idParam(req.query.id);
    if (id === null) { json(res, 400, { error: 'ID tidak valid' }); return; }

    if (req.method === 'PUT') {
      const p = parseBook(req.body);
      if (!p.ok) { json(res, 400, { error: p.error }); return; }
      json(res, 200, { book: await prisma().book.update({ where: { id }, data: p.value, select }) });
      return;
    }
    if (req.method === 'DELETE') {
      await prisma().book.delete({ where: { id } });
      json(res, 200, { ok: true });
      return;
    }
    json(res, 405, { error: 'Method tidak didukung' });
  } catch (err) {
    fail(res, err);
  }
}
