import type { Book, Category, Priority, Role, Slide, User } from './shared';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

interface BookRow { id: number; title: string; author: string; category: Category; year: number; stock: number; isbn: string }
interface SlideRow { id: number; imageUrl: string; eyebrow: string; title: string; body: string; buttonLabel: string; buttonLink: string }
interface UserRow { id: string; name: string; email: string; role: 'ADMIN' | 'STAFF' | 'MEMBER'; active: boolean }

const ROLE: Record<UserRow['role'], Role> = { ADMIN: 'Admin', STAFF: 'Pustakawan', MEMBER: 'Anggota' };
const toBook = (r: BookRow): Book => ({ id: r.id, t: r.title, a: r.author, c: r.category, y: r.year, s: r.stock, i: r.isbn });
const toSlide = (r: SlideRow): Slide => ({ id: r.id, img: r.imageUrl, eyebrow: r.eyebrow, title: r.title, text: r.body, btn: r.buttonLabel, link: r.buttonLink });
const toUser = (r: UserRow): User => ({ id: r.id, n: r.name, e: r.email, r: ROLE[r.role], on: r.active });
const bookBody = (b: Omit<Book, 'id'>) => ({ title: b.t, author: b.a, category: b.c, year: b.y, stock: b.s, isbn: b.i });
const slideBody = (s: Omit<Slide, 'id'>) => ({ imageUrl: s.img, eyebrow: s.eyebrow, title: s.title, body: s.text, buttonLabel: s.btn, buttonLink: s.link });

type Init = Omit<RequestInit, 'body' | 'headers'> & {
  priority?: Priority;
  json?: unknown;
  raw?: Blob;
  headers?: Record<string, string>;
};

async function call<T>(url: string, init: Init = {}): Promise<T> {
  const { json, raw, headers, ...rest } = init;
  const h: Record<string, string> = { ...headers };
  let body: BodyInit | undefined;
  if (json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  else if (raw) body = raw;

  const res = await fetch(url, { credentials: 'same-origin', ...rest, headers: h, ...(body ? { body } : {}) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401 && url !== '/api/login') {
    location.replace('/login'); // sesi habis
    throw new ApiError(401, 'Sesi berakhir');
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Permintaan gagal');
  return data as T;
}

/* ---------- Publik (landing) ---------- */
export async function getCatalog(priority: Priority): Promise<{ books: Book[]; slides: Slide[] }> {
  const d = await call<{ books: BookRow[]; slides: SlideRow[] }>('/api/catalog', { priority });
  return { books: d.books.map(toBook), slides: d.slides.map(toSlide) };
}
export async function searchBooks(q: string, category: string, signal?: AbortSignal): Promise<Book[]> {
  const p = new URLSearchParams({ only: 'books' });
  if (q.trim()) p.set('q', q.trim());
  if (category) p.set('category', category);
  const d = await call<{ books: BookRow[] }>(`/api/catalog?${p}`, { priority: 'high', ...(signal ? { signal } : {}) });
  return d.books.map(toBook);
}

/* ---------- Auth ---------- */
export const login = (email: string, password: string): Promise<{ ok: true }> =>
  call('/api/login', { method: 'POST', json: { email, password } });
export const logout = (): Promise<{ ok: true }> => call('/api/logout', { method: 'POST' });

/* ---------- Admin: buku ---------- */
export async function listBooks(): Promise<Book[]> {
  return (await call<{ books: BookRow[] }>('/api/books', { priority: 'high' })).books.map(toBook);
}
export async function createBook(b: Omit<Book, 'id'>): Promise<Book> {
  return toBook((await call<{ book: BookRow }>('/api/books', { method: 'POST', json: bookBody(b) })).book);
}
export async function updateBook(id: number, b: Omit<Book, 'id'>): Promise<Book> {
  return toBook((await call<{ book: BookRow }>(`/api/books?id=${id}`, { method: 'PUT', json: bookBody(b) })).book);
}
export async function deleteBook(id: number): Promise<true> {
  await call(`/api/books?id=${id}`, { method: 'DELETE' });
  return true;
}

/* ---------- Admin: slide banner ---------- */
export async function listSlides(): Promise<Slide[]> {
  return (await call<{ slides: SlideRow[] }>('/api/slides', { priority: 'high' })).slides.map(toSlide);
}
export async function createSlide(s: Omit<Slide, 'id'>): Promise<Slide> {
  return toSlide((await call<{ slide: SlideRow }>('/api/slides', { method: 'POST', json: slideBody(s) })).slide);
}
export async function updateSlide(id: number, s: Omit<Slide, 'id'>): Promise<Slide> {
  return toSlide((await call<{ slide: SlideRow }>(`/api/slides?id=${id}`, { method: 'PUT', json: slideBody(s) })).slide);
}
export async function deleteSlide(id: number): Promise<true> {
  await call(`/api/slides?id=${id}`, { method: 'DELETE' });
  return true;
}
export async function reorderSlides(order: number[]): Promise<true> {
  await call('/api/slides', { method: 'PATCH', json: { order } });
  return true;
}
export async function uploadImage(blob: Blob): Promise<string> {
  const d = await call<{ url: string }>('/api/upload', {
    method: 'POST',
    raw: blob,
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Type': blob.type },
  });
  return d.url;
}

/* ---------- Admin: pengguna ---------- */
export async function listUsers(): Promise<User[]> {
  return (await call<{ users: UserRow[] }>('/api/users', { priority: 'low' })).users.map(toUser);
}
export async function setUserActive(id: string, active: boolean): Promise<User> {
  return toUser((await call<{ user: UserRow }>(`/api/users?id=${encodeURIComponent(id)}`, { method: 'PATCH', json: { active } })).user);
}
