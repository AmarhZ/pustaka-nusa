import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAdmin } from './_lib/auth';
import { fail } from './_lib/http';

const read = (file: string): string => readFileSync(join(process.cwd(), 'private', file), 'utf8');
const escHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** Melayani /admin (HTML) dan /admin/app.js. Hanya untuk admin aktif; selain itu diarahkan ke /login. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    const admin = await getAdmin(req);
    const asset = typeof req.query.asset === 'string' ? req.query.asset : '';

    if (!admin) {
      if (asset) res.status(401).send('Tidak diizinkan');
      else res.redirect(302, '/login');
      return;
    }
    if (asset) {
      if (asset !== 'app.js') { res.status(404).send('Tidak ditemukan'); return; }
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.status(200).send(read('app.js'));
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(read('admin.html').replace('{{EMAIL}}', escHtml(admin.email)));
  } catch (err) {
    fail(res, err);
  }
}
