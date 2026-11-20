import type { VercelRequest, VercelResponse } from '@vercel/node';
import { startSession } from './_lib/auth';
import { prisma } from './_lib/db';
import { fail, json, sameOrigin } from './_lib/http';
import { verifyPassword } from './_lib/password';

const GENERIC = 'Email atau kata sandi salah, akun bukan admin, atau akun terkunci sementara.';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') { json(res, 405, { error: 'Method tidak didukung' }); return; }
    if (!sameOrigin(req)) { json(res, 403, { error: 'Origin tidak diizinkan' }); return; }

    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 200) {
      json(res, 400, { error: 'Email atau kata sandi tidak valid' });
      return;
    }

    const user = await prisma().user.findUnique({ where: { email } });
    const locked = !!user?.lockedUntil && user.lockedUntil > new Date();
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? null); // selalu dihitung
    const eligible = !!user && user.role === 'ADMIN' && user.active && !locked;

    if (!user || !passwordOk || !eligible) {
      if (user && !locked && !passwordOk) {
        // Hitung percobaan gagal; kunci 15 menit setelah 5 kali
        const upd = await prisma().user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
        if (upd.failedLogins >= MAX_FAILS) {
          await prisma().user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } });
        }
      }
      await wait(400);
      json(res, 401, { error: GENERIC });
      return;
    }

    await prisma().user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await startSession(res, user.id);
    json(res, 200, { ok: true });
  } catch (err) {
    fail(res, err);
  }
}
