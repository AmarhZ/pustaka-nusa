import { createHash, randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './db';
import { json, sameOrigin } from './http';

export const SESSION_COOKIE = 'pn_session';
const SESSION_TTL_SEC = 12 * 60 * 60;

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* abaikan */ }
  }
  return out;
}

const cookie = (value: string, maxAge: number): string =>
  `${SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

export const sessionToken = (req: VercelRequest): string => parseCookies(req.headers.cookie)[SESSION_COOKIE] ?? '';

/** Buat sesi baru; token mentah hanya ada di cookie, database menyimpan hash-nya. */
export async function startSession(res: VercelResponse, userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  await prisma().session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_SEC * 1000) },
  });
  await prisma().session.deleteMany({ where: { expiresAt: { lt: new Date() } } }); // bersihkan sesi lama
  res.setHeader('Set-Cookie', cookie(token, SESSION_TTL_SEC));
}

export async function endSession(req: VercelRequest, res: VercelResponse): Promise<void> {
  const token = sessionToken(req);
  if (token) await prisma().session.deleteMany({ where: { tokenHash: sha256(token) } });
  res.setHeader('Set-Cookie', cookie('', 0));
}

export interface AdminUser { id: string; email: string }

/** Sesi harus valid, belum kedaluwarsa, dan pemiliknya ADMIN yang aktif. */
export async function getAdmin(req: VercelRequest): Promise<AdminUser | null> {
  const token = sessionToken(req);
  if (!token || token.length > 100) return null;
  const s = await prisma().session.findUnique({
    where: { tokenHash: sha256(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true, role: true, active: true } } },
  });
  if (!s || s.expiresAt <= new Date()) return null;
  if (s.user.role !== 'ADMIN' || !s.user.active) return null;
  return { id: s.user.id, email: s.user.email };
}

/** Pagar untuk API admin. Mengirim 401/403 sendiri dan mengembalikan null bila ditolak. */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
  opts: { write?: boolean } = {},
): Promise<AdminUser | null> {
  if (opts.write && !sameOrigin(req)) {
    json(res, 403, { error: 'Origin tidak diizinkan' });
    return null;
  }
  const admin = await getAdmin(req);
  if (!admin) {
    json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });
    return null;
  }
  return admin;
}
