import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/auth';
import { prisma } from './_lib/db';
import { fail, json } from './_lib/http';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function looksLike(type: string, b: Buffer): boolean {
  if (type === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === 'image/png') return b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
}

/** Simpan foto banner ke database. Body: biner mentah (application/octet-stream) + header X-File-Type. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') { json(res, 405, { error: 'Method tidak didukung' }); return; }
    if (!(await requireAdmin(req, res, { write: true }))) return;

    const type = String(req.headers['x-file-type'] ?? '');
    const body: unknown = req.body;
    if (!TYPES.includes(type) || !Buffer.isBuffer(body)) { json(res, 400, { error: 'Gunakan gambar JPG, PNG, atau WebP' }); return; }
    if (body.length === 0 || body.length > MAX_BYTES) { json(res, 400, { error: 'Ukuran gambar maksimal 2 MB' }); return; }
    if (!looksLike(type, body)) { json(res, 400, { error: 'Isi file bukan gambar yang valid' }); return; }

    const img = await prisma().image.create({
      data: { mime: type, data: new Uint8Array(body), size: body.length },
      select: { id: true },
    });
    json(res, 201, { url: `/api/image?id=${img.id}` });
  } catch (err) {
    fail(res, err);
  }
}
