import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/db';
import { fail, json } from './_lib/http';

/** Melayani foto banner yang diunggah. ID unik per unggahan, jadi aman di-cache selamanya. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'GET') { json(res, 405, { error: 'Method tidak didukung' }); return; }
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!/^[a-z0-9]{10,40}$/.test(id)) { res.status(404).send('Tidak ditemukan'); return; }

    const etag = `"${id}"`;
    if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }

    const img = await prisma().image.findUnique({ where: { id }, select: { mime: true, data: true } });
    if (!img) { res.status(404).send('Tidak ditemukan'); return; }

    res.setHeader('Content-Type', img.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', etag);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.status(200).send(Buffer.from(img.data));
  } catch (err) {
    fail(res, err);
  }
}
