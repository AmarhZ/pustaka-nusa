import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/db';
import { fail, json } from './_lib/http';
import { isCategory } from './_lib/validate';

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? '' : v ?? '');

/** Publik (read-only). ?q= & ?category= untuk pencarian, ?only=books untuk melewati slide. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'GET') { json(res, 405, { error: 'Method tidak didukung' }); return; }
    const q = first(req.query.q).replace(/[^\p{L}\p{N}\s.'-]/gu, '').trim().slice(0, 60);
    const category = first(req.query.category);
    const wantSlides = first(req.query.only) !== 'books';

    const [books, slides] = await Promise.all([
      prisma().book.findMany({
        where: {
          ...(isCategory(category) ? { category } : {}),
          ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { author: { contains: q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { title: 'asc' },
        take: 500,
        select: { id: true, title: true, author: true, category: true, year: true, stock: true, isbn: true },
      }),
      wantSlides
        ? prisma().slide.findMany({
            orderBy: { position: 'asc' },
            select: { id: true, imageUrl: true, eyebrow: true, title: true, body: true, buttonLabel: true, buttonLink: true },
          })
        : Promise.resolve([]),
    ]);

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
    res.status(200).json({ books, slides });
  } catch (err) {
    fail(res, err);
  }
}
