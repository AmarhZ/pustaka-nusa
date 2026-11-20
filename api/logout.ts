import type { VercelRequest, VercelResponse } from '@vercel/node';
import { endSession } from './_lib/auth';
import { fail, json } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') { json(res, 405, { error: 'Method tidak didukung' }); return; }
    await endSession(req, res); // hapus sesi di database + cookie
    json(res, 200, { ok: true });
  } catch (err) {
    fail(res, err);
  }
}
