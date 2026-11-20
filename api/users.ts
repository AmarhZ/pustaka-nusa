import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/auth';
import { prisma } from './_lib/db';
import { fail, json } from './_lib/http';

const ID = /^[a-z0-9]{20,40}$/;
const select = { id: true, name: true, email: true, role: true, active: true } as const;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const admin = await requireAdmin(req, res, { write: req.method !== 'GET' });
    if (!admin) return;

    if (req.method === 'GET') {
      json(res, 200, { users: await prisma().user.findMany({ orderBy: { createdAt: 'asc' }, select }) });
      return;
    }
    if (req.method === 'PATCH') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      const active = (req.body as { active?: unknown } | undefined)?.active;
      if (!ID.test(id) || typeof active !== 'boolean') { json(res, 400, { error: 'Permintaan tidak valid' }); return; }
      if (id === admin.id) { json(res, 400, { error: 'Anda tidak dapat menonaktifkan akun sendiri' }); return; }
      const user = await prisma().user.update({ where: { id }, data: { active }, select });
      if (!active) await prisma().session.deleteMany({ where: { userId: id } }); // putuskan sesi yang sedang berjalan
      json(res, 200, { user });
      return;
    }
    json(res, 405, { error: 'Method tidak didukung' });
  } catch (err) {
    fail(res, err);
  }
}
