import { prisma } from './db';

export const IMAGE_URL = /^\/api\/image\?id=([a-z0-9]{10,40})$/;

/** Hapus baris Image jika URL menunjuk ke gambar unggahan kita (best-effort). */
export async function dropImage(url: string | null | undefined): Promise<void> {
  const m = url ? IMAGE_URL.exec(url) : null;
  if (m?.[1]) await prisma().image.deleteMany({ where: { id: m[1] } }).catch(() => undefined);
}
