export type Category = 'Fiksi' | 'Sains' | 'Sejarah' | 'Teknologi' | 'Anak' | 'Bisnis';
export type Role = 'Admin' | 'Pustakawan' | 'Anggota';
export type Priority = 'high' | 'low' | 'auto';

export interface Book {
  id: number;
  t: string; // judul
  a: string; // penulis
  c: Category;
  y: number; // tahun
  s: number; // stok
  i: string; // ISBN
}
export interface User {
  n: string;
  e: string;
  r: Role;
  on: boolean;
}

export const CATS: Category[] = ['Fiksi', 'Sains', 'Sejarah', 'Teknologi', 'Anak', 'Bisnis'];

export const SEED: Book[] = [
  { id: 1, t: 'Laskar Pelangi', a: 'Andrea Hirata', c: 'Fiksi', y: 2005, s: 5, i: '9789793062792' },
  { id: 2, t: 'Bumi Manusia', a: 'Pramoedya A. Toer', c: 'Fiksi', y: 1980, s: 3, i: '9789799731234' },
  { id: 3, t: 'Sapiens', a: 'Yuval Noah Harari', c: 'Sejarah', y: 2011, s: 0, i: '9786020322056' },
  { id: 4, t: 'Kosmos', a: 'Carl Sagan', c: 'Sains', y: 1980, s: 4, i: '9789791234567' },
  { id: 5, t: 'Clean Code', a: 'Robert C. Martin', c: 'Teknologi', y: 2008, s: 6, i: '9780132350884' },
  { id: 6, t: 'Si Kancil dan Buaya', a: 'Tim Dongeng Nusantara', c: 'Anak', y: 2015, s: 9, i: '9786021111111' },
  { id: 7, t: 'Atomic Habits', a: 'James Clear', c: 'Bisnis', y: 2018, s: 2, i: '9786020633176' },
  { id: 8, t: 'Sejarah Indonesia Modern', a: 'M.C. Ricklefs', c: 'Sejarah', y: 1981, s: 2, i: '9789792222222' },
  { id: 9, t: 'Brief Answers', a: 'Stephen Hawking', c: 'Sains', y: 2018, s: 3, i: '9786020000003' },
  { id: 10, t: 'Eloquent JavaScript', a: 'Marijn Haverbeke', c: 'Teknologi', y: 2018, s: 4, i: '9781593279509' },
];

export const USERS: User[] = [
  { n: 'Sari Wulandari', e: 'sari@mail.id', r: 'Admin', on: true },
  { n: 'Budi Santoso', e: 'budi@mail.id', r: 'Pustakawan', on: true },
  { n: 'Maria Kogoya', e: 'maria@mail.id', r: 'Anggota', on: true },
  { n: 'Yosef Wanimbo', e: 'yosef@mail.id', r: 'Anggota', on: true },
];

export const ICON: Record<Category, string> = {
  Fiksi: '📖', Sains: '🔭', Sejarah: '🏛️', Teknologi: '💻', Anak: '🧸', Bisnis: '📈',
};

/* ---------- DOM helpers ---------- */
export function $<T extends HTMLElement = HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Elemen tidak ditemukan: ${sel}`);
  return el;
}
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string): T[] =>
  Array.from(document.querySelectorAll<T>(sel));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: string | number): string => String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);

export const hue = (s: string): number =>
  Array.from(s).reduce((h, c) => h * 31 + c.charCodeAt(0), 7) % 360;

export function fillCats(sel: HTMLSelectElement, withAll: boolean): void {
  const first = withAll ? 'Semua kategori' : 'Pilih…';
  sel.innerHTML =
    `<option value="">${first}</option>` + CATS.map((c) => `<option>${c}</option>`).join('');
}

export function toast(msg: string): void {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.append(d);
  setTimeout(() => d.remove(), 2000);
}

/* ---------- View Transitions ---------- */
type VTDocument = Document & { startViewTransition?: (cb: () => void) => unknown };
export function vt(update: () => void): void {
  const d = document as VTDocument;
  if (d.startViewTransition) d.startViewTransition(update);
  else update();
}

/* ---------- Tema ---------- */
export function initTheme(): void {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('pn-theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch { /* abaikan */ }
  document.querySelector<HTMLButtonElement>('#theme')?.addEventListener('click', () => {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = root.dataset.theme ?? (dark ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('pn-theme', next); } catch { /* abaikan */ }
  });
}

/* ---------- Data & Fetch Priority ---------- */
const KEY = 'pn-books';
export const state: { books: Book[] } = { books: [] };

export function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(state.books)); } catch { /* abaikan */ }
}
function readStored(): Book[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Book[]) : [];
  } catch {
    return [];
  }
}

/** Simulasi pengambilan data lewat fetch dengan prioritas eksplisit. */
export async function fetchData<T>(data: T, priority: Priority): Promise<T> {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  try {
    const init: RequestInit & { priority?: Priority } = { priority };
    const res = await fetch(url, init);
    return (await res.json()) as T;
  } catch {
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Katalog = data kritis untuk render awal -> priority high. */
export async function loadBooks(): Promise<Book[]> {
  const stored = readStored();
  state.books = await fetchData(stored.length ? stored : SEED, 'high');
  if (!stored.length) save();
  return state.books;
}
