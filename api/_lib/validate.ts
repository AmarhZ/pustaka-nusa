export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const CATEGORIES = ['Fiksi', 'Sains', 'Sejarah', 'Teknologi', 'Anak', 'Bisnis'] as const;
export type CategoryName = (typeof CATEGORIES)[number];
export interface BookInput { title: string; author: string; category: CategoryName; year: number; stock: number; isbn: string }
export interface SlideInput {
  imageUrl: string; eyebrow: string; title: string; body: string; buttonLabel: string; buttonLink: string;
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
const text = (v: unknown, min: number, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
};
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
export const isCategory = (v: unknown): v is CategoryName => (CATEGORIES as readonly unknown[]).includes(v);

export function parseBook(input: unknown): Result<BookInput> {
  const o = obj(input);
  const title = text(o.title, 3, 200);
  const author = text(o.author, 3, 120);
  const year = int(o.year, 1900, 2100);
  const stock = int(o.stock, 0, 999);
  const isbn = typeof o.isbn === 'string' && /^(\d{10}|\d{13})$/.test(o.isbn) ? o.isbn : null;
  if (!title) return { ok: false, error: 'Judul harus 3–200 karakter' };
  if (!author) return { ok: false, error: 'Penulis harus 3–120 karakter' };
  if (!isCategory(o.category)) return { ok: false, error: 'Kategori tidak valid' };
  if (year === null) return { ok: false, error: 'Tahun harus 1900–2100' };
  if (stock === null) return { ok: false, error: 'Stok harus 0–999' };
  if (!isbn) return { ok: false, error: 'ISBN harus 10 atau 13 digit' };
  return { ok: true, value: { title, author, category: o.category, year, stock, isbn } };
}

export function parseSlide(input: unknown): Result<SlideInput> {
  const o = obj(input);
  const imageUrl = text(o.imageUrl, 1, 2048);
  const eyebrow = o.eyebrow === undefined || o.eyebrow === '' ? '' : text(o.eyebrow, 0, 40);
  const title = text(o.title, 3, 80);
  const body = o.body === undefined || o.body === '' ? '' : text(o.body, 0, 160);
  const buttonLabel = text(o.buttonLabel, 1, 30);
  const buttonLink = text(o.buttonLink, 1, 300);
  if (!imageUrl || !/^(https:\/\/|\/)\S+$/.test(imageUrl)) return { ok: false, error: 'URL gambar harus diawali https:// atau /' };
  if (eyebrow === null) return { ok: false, error: 'Teks kecil maksimal 40 karakter' };
  if (!title) return { ok: false, error: 'Judul harus 3–80 karakter' };
  if (body === null) return { ok: false, error: 'Deskripsi maksimal 160 karakter' };
  if (!buttonLabel) return { ok: false, error: 'Teks tombol harus 1–30 karakter' };
  if (!buttonLink || !/^(#|\/|https?:\/\/)\S*$/.test(buttonLink)) return { ok: false, error: 'Tautan harus #bagian, /halaman, atau https://…' };
  return { ok: true, value: { imageUrl, eyebrow, title, body, buttonLabel, buttonLink } };
}
