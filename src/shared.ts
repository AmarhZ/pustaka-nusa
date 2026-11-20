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
  id: string;
  n: string;
  e: string;
  r: Role;
  on: boolean;
}
export interface Slide {
  id: number;
  img: string; // URL gambar (https://... atau /path)
  eyebrow: string;
  title: string;
  text: string;
  btn: string;
  link: string;
}

export const CATS: Category[] = ['Fiksi', 'Sains', 'Sejarah', 'Teknologi', 'Anak', 'Bisnis'];
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

/** Hanya izinkan #anchor, /path, atau http(s):// (cegah javascript:). */
export const safeLink = (l: string): string => (/^(#|\/|https?:\/\/)/.test(l) ? l : '#cari');

export function slideHtml(s: Slide, i: number, total: number): string {
  const h = i === 0 ? 'h1' : 'h2';
  const img = `<img src="${esc(s.img)}" alt="" width="1600" height="900"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
  const eyebrow = s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : '';
  return `<li class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} dari ${total}">
    ${img}
    <div class="txt">${eyebrow}<${h}>${esc(s.title)}</${h}><p>${esc(s.text)}</p><a class="btn" href="${esc(safeLink(s.link))}" style="text-decoration:none;display:inline-block">${esc(s.btn)}</a></div>
  </li>`;
}
export function renderSlides(track: HTMLElement, slides: Slide[]): void {
  track.innerHTML = slides.map((s, i) => slideHtml(s, i, slides.length)).join('');
}
