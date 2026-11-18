import { $, ICON, esc, fillCats, fetchData, hue, initTheme, loadBooks, state, vt } from './shared';

const qEl = $<HTMLInputElement>('#q');
const catEl = $<HTMLSelectElement>('#cat');
const booksEl = $<HTMLUListElement>('#books');
const statusEl = $('#status');

function matches(query: string, category: string) {
  return (b: { t: string; a: string; c: string }): boolean =>
    (!category || b.c === category) && (b.t + b.a).toLowerCase().includes(query);
}

function renderCatalog(): void {
  const result = state.books.filter(matches(qEl.value.toLowerCase(), catEl.value));
  statusEl.textContent = `${result.length} buku ditemukan`;
  booksEl.innerHTML =
    result
      .map((b) => {
        const h = hue(b.t);
        const bg = `linear-gradient(135deg,hsl(${255 + (h % 50)} 34% 62%),hsl(${255 + ((h + 20) % 50)} 38% 42%))`;
        return `<li class="book">
  <div class="cover" style="background:${bg}">${ICON[b.c] ?? '📕'}</div>
  <h3>${esc(b.t)}</h3><div class="by">${esc(b.a)} · ${b.y}</div>
  <div class="meta"><span class="tag">${b.c}</span>
  <span class="${b.s ? 'ok' : 'no'}">${b.s ? `${b.s} tersedia` : 'Dipinjam'}</span></div></li>`;
      })
      .join('') || '<li>Tidak ada hasil.</li>';
}

let timer: number | undefined;
qEl.addEventListener('input', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    // Pencarian: prioritas tinggi agar hasil cepat
    const q = qEl.value.toLowerCase();
    await fetchData(state.books.filter(matches(q, '')), 'high');
    renderCatalog();
  }, 150);
});
catEl.addEventListener('change', () => vt(renderCatalog));
$('#layout').addEventListener('click', () => vt(() => booksEl.classList.toggle('wide')));

async function main(): Promise<void> {
  initTheme();
  fillCats(catEl, true);
  statusEl.textContent = 'Memuat katalog…';
  await loadBooks();
  renderCatalog();
}
void main();
