import type { VercelRequest, VercelResponse } from '@vercel/node';

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

/** Tolak request lintas-origin (lapisan tambahan di atas cookie SameSite=Strict). */
export function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function fail(res: VercelResponse, err: unknown): void {
  const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: string }).code : undefined;
  if (code === 'P2025') { json(res, 404, { error: 'Data tidak ditemukan' }); return; } // record tidak ada
  console.error(err);
  json(res, 500, { error: 'Terjadi kesalahan pada server' });
}

export function idParam(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}
