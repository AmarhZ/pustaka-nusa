import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

const secret = (): string => process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? '';
const sign = (v: string): string => createHmac('sha256', secret()).update(v).digest('hex');
const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

export const safeEq = (a: string, b: string): boolean => timingSafeEqual(digest(a), digest(b));

export function makeToken(ttlSeconds = 8 * 3600): string {
  const exp = String(Math.floor(Date.now() / 1000) + ttlSeconds);
  return `${exp}.${sign(exp)}`;
}

export function isAuthed(req: VercelRequest): boolean {
  if (!secret()) return false;
  const m = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie ?? '');
  if (!m?.[1]) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEq(sig, sign(exp));
}
