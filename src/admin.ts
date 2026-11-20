import {
  createBook, deleteBook, listBooks, listUsers, logout, setUserActive, updateBook,
} from './api';
import { initSlideAdmin, renderSlideList } from './admin-slides';
import { $, $$, CATS, esc, fillCats, initTheme, toast, vt } from './shared';
import type { Book, Category, User } from './shared';

type SortKey = 't' | 'a' | 'c' | 'y' | 's';
type Field = HTMLInputElement | HTMLSelectElement;

let books: Book[] = [];
let users: User[] = [];
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

/** Jalankan aksi API; tampilkan pesan galat sebagai toast. */
async function guard<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p;
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Terjadi kesalahan');
    return undefined;
  }
}

/* ---------- Tab / modul (view transitions) ---------- */
function showTab(name: string): void {
  vt(() => {
    $$<HTMLButtonElement>('.side button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('[data-p]').forEach((p) => { p.hidden = p.dataset.p !== name; });
    if (name === 'dash') renderStats();
    if (name === 'banner') renderSlideList();
  });
}
$$<HTMLButtonElement>('.side button').forEach((b) =>
  b.addEventListener('click', () => {
    const tab = b.dataset.tab ?? 'dash';
    if (tab === 'form') resetForm();
    showTab(tab);
  }),
);
$('#logout').addEventListener('click', async () => {
  await logout().catch(() => undefined);
  location.replace('/login');
});

/* ---------- Dashboard ---------- */
function renderStats(): void {
  const total = books.reduce((sum, b) => sum + b.s, 0);
  const out = books.filter((b) => !b.s).length;
  const cards: [string, number][] = [
    ['Judul', books.length],
    ['Eksemplar tersedia', total],
    ['Judul habis', out],
    ['Anggota aktif', users.filter((u) => u.r === 'Anggota' && u.on).length],
  ];
  $('#stats').innerHTML = cards.map(([label, n]) => `<div class="card stat"><b>${n}</b>${label}</div>`).join('');
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
  const rows = books
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

$('#abody').addEventListener('click', async (e: MouseEvent) => {
  const { e: editId, d: delId } = (e.target as HTMLElement).dataset;
  if (editId) {
    const b = books.find((x) => x.id === Number(editId));
    if (!b) return;
    fid.value = String(b.id);
    ft.value = b.t; fa.value = b.a; fc.value = b.c; fi.value = b.i;
    fy.value = String(b.y); fs.value = String(b.s);
    ftitle.textContent = 'Edit Buku';
    showTab('form');
  }
  if (delId && confirm('Hapus buku ini?')) {
    if (await guard(deleteBook(Number(delId)))) {
      books = books.filter((x) => x.id !== Number(delId));
      vt(renderList);
      toast('Buku dihapus');
    }
  }
});

/* ---------- Form tambah/edit + validasi ---------- */
function resetForm(): void {
  form.reset();
  fid.value = '';
  ftitle.textContent = 'Tambah Buku';
  $$('#bf .err').forEach((e) => { e.textContent = ''; });
}
$('#fr').addEventListener('click', resetForm);

function messageFor(f: Field): string {
  const v = f.validity;
  if (v.valid) return '';
  if (v.valueMissing) return 'Wajib diisi';
  if (v.patternMismatch) return 'Format tidak valid (10 atau 13 digit)';
  return 'Nilai di luar batas / terlalu pendek';
}

form.addEventListener('submit', async (e: SubmitEvent) => {
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
  const id = Number(fid.value);
  const saved = await guard(id ? updateBook(id, data) : createBook(data));
  if (!saved) return;
  books = id ? books.map((b) => (b.id === id ? saved : b)) : [...books, saved];
  toast('Buku tersimpan ✓');
  resetForm();
  renderList();
  showTab('buku');
});

/* ---------- Pengguna ---------- */
function renderUsers(): void {
  $('#ubody').innerHTML = users
    .map(
      (u) => `<tr><td>${esc(u.n)}</td><td>${esc(u.e)}</td><td>${u.r}</td>
<td><button class="btn sm ${u.on ? '' : 'ghost'}" data-u="${esc(u.id)}">${u.on ? 'Aktif' : 'Nonaktif'}</button></td></tr>`,
    )
    .join('') || '<tr><td colspan="4">Belum ada pengguna.</td></tr>';
}
$('#ubody').addEventListener('click', async (e: MouseEvent) => {
  const id = (e.target as HTMLElement).dataset.u;
  const user = users.find((u) => u.id === id);
  if (!user) return;
  const saved = await guard(setUserActive(user.id, !user.on));
  if (!saved) return;
  users = users.map((u) => (u.id === saved.id ? saved : u));
  renderUsers();
  renderStats();
});

/* ---------- Boot ---------- */
async function main(): Promise<void> {
  initTheme();
  fillCats(acat, true);
  fillCats(fc, false);
  const [b, u] = await Promise.all([guard(listBooks()), guard(listUsers()), initSlideAdmin()]);
  books = b ?? [];
  users = u ?? [];
  renderStats();
  renderList();
  renderUsers();
}
void main();
