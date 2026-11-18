import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isAuthed } from './_auth';

// Aset admin yang hanya boleh diambil setelah login
const ASSETS: Record<string, string> = { 'app.js': 'text/javascript; charset=utf-8' };

const read = (file: string): string => readFileSync(join(process.cwd(), 'private', file), 'utf8');

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const authed = isAuthed(req);
  const asset = typeof req.query.asset === 'string' ? req.query.asset : '';
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');

  if (asset) {
    const type = ASSETS[asset];
    if (!authed || !type) {
      res.status(authed ? 404 : 401).send('Tidak ditemukan');
      return;
    }
    res.setHeader('Content-Type', type);
    res.status(200).send(read(asset));
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(read(authed ? 'admin.html' : 'login.html'));
}
