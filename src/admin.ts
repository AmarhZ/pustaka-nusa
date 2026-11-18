import {
  $, $$, CATS, USERS, esc, fetchData, fillCats, initTheme, loadBooks, save, state, toast, vt,
} from './shared';
import type { Book, Category, User } from './shared';

type SortKey = 't' | 'a' | 'c' | 'y' | 's';
type Field = HTMLInputElement | HTMLSelectElement;

let users: User[] = USERS.map((u) => ({ ...u }));
let sortKey: SortKey = 't';
let sortDir: 1 | -1 = 1;

const aq = $<HTMLInputElement>('#aq');
const acat = $<HTMLSelectElement>('#acat');
const form = $<HTMLFormElement>('#bf');
const fid = $<HTMLInputElement>('#fid');
const ft = $<HTMLInputElement>('#ft');
const fa = $<HTMLInputElement>('#fa');
const fc = $<HTMLSelectElement>('#fc');
const fi = $<HTMLInputElement>('#fi');
const fy = $<HTMLInputElement>('#fy');
const fs = $<HTMLInputElement>('#fs');
const ftitle = $('#ftitle');

/* ---------- Tab / modul (view transitions) ---------- */
function showTab(name: string): void {
  vt(() => {
    $$<HTMLButtonElement>('.side button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('[data-p]').forEach((p) => { p.hidden = p.dataset.p !== name; });
    if (name === 'dash') renderStats();
  });
}
$$<HTMLButtonElement>('.side button').forEach((b) =>
  b.addEventListener('click', () => {
    const tab = b.dataset.tab ?? 'dash';
    if (tab === 'form') resetForm();
    showTab(tab);
  }),
);

/* ---------- Dashboard ---------- */
function renderStats(): void {
  const books = state.books;
  const total = books.reduce((sum, b) => sum + b.s, 0);
  const out = books.filter((b) => !b.s).length;
  const cards: [string, number][] = [
    ['Judul', books.length],
    ['Eksemplar tersedia', total],
    ['Judul habis', out],
    ['Anggota aktif', users.filter((u) => u.on).length],
  ];
  $('#stats').innerHTML = cards
    .map(([label, n]) => `<div class="card stat"><b>${n}</b>${label}</div>`)
    .join('');
  const counts = CATS.map((c) => books.filter((b) => b.c === c).length);
  const max = Math.max(1, ...counts);
  $('#chart').innerHTML = CATS.map(
    (c, i) =>
      `<div class="row"><span>${c}</span><div class="track"><div class="fill" style="width:${((counts[i] ?? 0) / max) * 100}%"></div></div><b>${counts[i]}</b></div>`,
  ).join('');
}

/* ---------- Daftar buku: sort & filter ---------- */
const cmp = (x: string | number, y: string | number): number =>
  typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));

function renderList(): void {
  const q = aq.value.toLowerCase();
  const c = acat.value;
  const rows = state.books
    .filter((b) => (!c || b.c === c) && (b.t + b.a).toLowerCase().includes(q))
    .sort((x, y) => cmp(x[sortKey], y[sortKey]) * sortDir);
  $('#abody').innerHTML =
    rows
      .map(
        (b) => `<tr><td>${esc(b.t)}</td><td>${esc(b.a)}</td><td>${b.c}</td><td>${b.y}</td><td>${b.s}</td>
<td><button class="btn sm" data-e="${b.id}">Edit</button> <button class="btn sm danger" data-d="${b.id}">Hapus</button></td></tr>`,
      )
      .join('') || '<tr><td colspan="6">Tidak ada data.</td></tr>';
}
$$<HTMLTableCellElement>('th[data-s]').forEach((th) =>
  th.addEventListener('click', () => {
    const key = th.dataset.s as SortKey;
    sortDir = sortKey === key ? (sortDir === 1 ? -1 : 1) : 1;
    sortKey = key;
    vt(renderList);
  }),
);
aq.addEventListener('input', renderList);
acat.addEventListener('change', () => vt(renderList));

$('#abody').addEventListener('click', (e: MouseEvent) => {
  const { e: editId, d: delId } = (e.target as HTMLElement).dataset;
  if (editId) {
    const b = state.books.find((x) => x.id === Number(editId));
    if (!b) return;
    fid.value = String(b.id);
    ft.value = b.t; fa.value = b.a; fc.value = b.c; fi.value = b.i;
    fy.value = String(b.y); fs.value = String(b.s);
    ftitle.textContent = 'Edit Buku';
    showTab('form');
  }
  if (delId && confirm('Hapus buku ini?')) {
    state.books = state.books.filter((x) => x.id !== Number(delId));
    save();
    vt(renderList);
    toast('Buku dihapus');
  }
});

/* ---------- Form tambah/edit + validasi ---------- */
function resetForm(): void {
  form.reset();
  fid.value = '';
  ftitle.textContent = 'Tambah Buku';
  $$('.err').forEach((e) => { e.textContent = ''; });
}
$('#fr').addEventListener('click', resetForm);

function messageFor(f: Field): string {
  const v = f.validity;
  if (v.valid) return '';
  if (v.valueMissing) return 'Wajib diisi';
  if (v.patternMismatch) return 'Format tidak valid (10 atau 13 digit)';
  return 'Nilai di luar batas / terlalu pendek';
}

form.addEventListener('submit', (e: SubmitEvent) => {
  e.preventDefault();
  let ok = true;
  $$<Field>('#bf input:not([type=hidden]), #bf select').forEach((f) => {
    const msg = messageFor(f);
    const slot = f.parentElement?.querySelector('.err');
    if (slot) slot.textContent = msg;
    if (msg) ok = false;
  });
  if (!ok) return;

  const data: Omit<Book, 'id'> = {
    t: ft.value.trim(), a: fa.value.trim(), c: fc.value as Category,
    i: fi.value, y: Number(fy.value), s: Number(fs.value),
  };
  const existing = state.books.find((b) => b.id === Number(fid.value));
  if (existing) Object.assign(existing, data);
  else state.books.push({ id: Date.now(), ...data });

  save();
  toast('Buku tersimpan ✓');
  resetForm();
  renderList();
  showTab('buku');
});

/* ---------- Pengguna ---------- */
function renderUsers(): void {
  $('#ubody').innerHTML = users
    .map(
      (u, i) => `<tr><td>${esc(u.n)}</td><td>${esc(u.e)}</td><td>${u.r}</td>
<td><button class="btn sm ${u.on ? '' : 'ghost'}" data-u="${i}">${u.on ? 'Aktif' : 'Nonaktif'}</button></td></tr>`,
    )
    .join('');
}
$('#ubody').addEventListener('click', (e: MouseEvent) => {
  const idx = (e.target as HTMLElement).dataset.u;
  const user = idx === undefined ? undefined : users[Number(idx)];
  if (!user) return;
  user.on = !user.on;
  renderUsers();
  renderStats();
});

/* ---------- Boot ---------- */
async function main(): Promise<void> {
  initTheme();
  fillCats(acat, true);
  fillCats(fc, false);
  await loadBooks(); // priority: high
  renderStats();
  renderList();
  users = await fetchData(users, 'low'); // data sekunder: priority low
  renderUsers();
  renderStats();
}
void main();
