import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeToken, safeEq } from './_auth';

interface LoginBody { password?: unknown }

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD belum diatur' });
    return;
  }
  const body = (req.body ?? {}) as LoginBody;
  const given = typeof body.password === 'string' ? body.password : '';
  if (!safeEq(given, expected)) {
    await new Promise((r) => setTimeout(r, 800)); // perlambat brute-force
    res.status(401).json({ error: 'salah' });
    return;
  }
  res.setHeader(
    'Set-Cookie',
    `session=${makeToken()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
  );
  res.status(200).json({ ok: true });
}
