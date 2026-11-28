import { getCatalog, searchBooks } from './api';
import { initSlider } from './slider';
import { $, $$, CATS, ICON, esc, fillCats, hue, initTheme, renderSlides, vt } from './shared';
import type { Book } from './shared';

const qEl = $<HTMLInputElement>('#q');
const catEl = $<HTMLSelectElement>('#cat');
const booksEl = $<HTMLUListElement>('#books');
const statusEl = $('#status');

function renderCatalog(list: Book[]): void {
  statusEl.textContent = `${list.length} buku ditemukan`;
  booksEl.innerHTML =
    list
      .map((b) => {
        const h = hue(b.t);
        const bg = `linear-gradient(135deg,hsl(${255 + (h % 50)} 34% 62%),hsl(${255 + ((h + 20) % 50)} 38% 42%))`;
        return `<li class="book">
  <div class="cover" style="background:${bg}">${ICON[b.c] ?? '📕'}</div>
  <h3>${esc(b.t)}</h3><div class="by">${esc(b.a)} · ${b.y}</div>
  <div class="meta"><span class="tag">${esc(b.c)}</span>
  <span class="${b.s ? 'ok' : 'no'}">${b.s ? `${b.s} tersedia` : 'Dipinjam'}</span></div></li>`;
      })
      .join('') || '<li>Tidak ada hasil.</li>';
}

/** Pencarian ke server dengan fetch priority tinggi; request lama dibatalkan. */
let ctrl: AbortController | undefined;
async function runSearch(): Promise<void> {
  ctrl?.abort();
  ctrl = new AbortController();
  const { signal } = ctrl;
  statusEl.textContent = 'Mencari…';
  try {
    const list = await searchBooks(qEl.value, catEl.value, signal);
    if (!signal.aborted) vt(() => renderCatalog(list));
  } catch (err) {
    if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
    statusEl.textContent = 'Gagal memuat data. Coba lagi.';
  }
}

let timer: number | undefined;
qEl.addEventListener('input', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void runSearch(), 200);
});
catEl.addEventListener('change', () => { syncChips(); void runSearch(); });

/* Chip kategori populer */
const chips = $('#chips');
chips.innerHTML = CATS.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="false">${ICON[c]} ${c}</button>`).join('');
function syncChips(): void {
  $$('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === catEl.value)));
}
chips.addEventListener('click', (e) => {
  const cat = (e.target as HTMLElement).closest<HTMLElement>('.chip')?.dataset.cat;
  if (!cat) return;
  catEl.value = catEl.value === cat ? '' : cat;
  syncChips();
  void runSearch();
  $('#cari').scrollIntoView({ behavior: 'smooth' });
});
$('#sform').addEventListener('submit', (e) => {
  e.preventDefault();
  void runSearch();
  $('#cari').scrollIntoView({ behavior: 'smooth' });
});

/* Status buka/tutup (zona waktu Papua) */
const HOURS: Record<string, [number, number]> = { Sat: [9, 16], Sun: [9, 16] };
function paintOpen(): void {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jayapura', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date())) p[x.type] = x.value;
  const now = Number(p.hour) + Number(p.minute) / 60;
  const [open, close] = HOURS[p.weekday ?? ''] ?? [8, 20];
  const isOpen = now >= open && now < close;
  $$('.js-open').forEach((el) => {
    el.dataset.open = String(isOpen);
    el.textContent = isOpen ? `● Buka sekarang · tutup pukul ${close}.00` : '● Tutup sekarang';
  });
}
paintOpen();
$('#layout').addEventListener('click', () => vt(() => booksEl.classList.toggle('wide')));

async function main(): Promise<void> {
  initTheme();
  fillCats(catEl, true);
  statusEl.textContent = 'Memuat katalog…';
  const hero = document.querySelector<HTMLElement>('#beranda');
  try {
    const { books, slides } = await getCatalog('high'); // data kritis untuk render awal
    renderCatalog(books);
    const track = hero?.querySelector<HTMLElement>('.track');
    if (track && slides.length) renderSlides(track, slides);
  } catch {
    statusEl.textContent = 'Gagal memuat katalog. Muat ulang halaman.';
  }
  if (hero) initSlider(hero);
}
void main();
