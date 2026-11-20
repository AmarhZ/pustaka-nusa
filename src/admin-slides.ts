import { createSlide, deleteSlide, listSlides, reorderSlides, updateSlide, uploadImage } from './api';
import { $, esc, safeLink, toast, vt } from './shared';
import type { Slide } from './shared';

type Field = HTMLInputElement | HTMLSelectElement;

const MAX_SLIDES = 8;
const MAX_UPLOAD = 15 * 1024 * 1024; // file asal
const MAX_BLOB = 900_000; // hasil kompresi (server membatasi 2 MB)

let slides: Slide[] = [];
let img = ''; // URL gambar yang tersimpan / diketik
let pending: Blob | null = null; // gambar baru yang belum diunggah
let previewUrl = '';

const $err = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('#s-formcard .err'));

/* ---------- Kompres gambar di browser ---------- */
async function compress(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Gunakan file JPG, PNG, atau WebP');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia di browser ini');
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  let out: Blob | null = null;
  for (const q of [0.82, 0.7, 0.6, 0.5]) {
    out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (out && out.size <= MAX_BLOB) break;
  }
  if (!out) throw new Error('Gagal memproses gambar');
  return out;
}

/* ---------- Daftar slide ---------- */
export function renderSlideList(): void {
  $('#s-info').textContent = `${slides.length}/${MAX_SLIDES} slide`;
  $('#slist').innerHTML = slides
    .map(
      (s, i) => `<li class="scard">
  <img src="${esc(s.img)}" alt="">
  <div><b>${i + 1}. ${esc(s.title)}</b><small>${esc(s.eyebrow || 'Tanpa teks kecil')}</small><small>Tombol: ${esc(s.btn)} → ${esc(s.link)}</small></div>
  <div class="acts">
    <button class="btn sm ghost" data-sup="${s.id}" ${i === 0 ? 'disabled' : ''} aria-label="Naik">↑</button>
    <button class="btn sm ghost" data-sdown="${s.id}" ${i === slides.length - 1 ? 'disabled' : ''} aria-label="Turun">↓</button>
    <button class="btn sm" data-sedit="${s.id}">Edit</button>
    <button class="btn sm danger" data-sdel="${s.id}">Hapus</button>
  </div></li>`,
    )
    .join('');
}

async function reload(): Promise<void> {
  slides = await listSlides();
  renderSlideList();
}

async function move(id: number, dir: -1 | 1): Promise<void> {
  const i = slides.findIndex((s) => s.id === id);
  const a = slides[i];
  const b = slides[i + dir];
  if (!a || !b) return;
  const next = [...slides];
  next[i] = b;
  next[i + dir] = a;
  slides = next;
  vt(renderSlideList);
  try {
    await reorderSlides(next.map((s) => s.id));
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Gagal mengubah urutan');
    await reload();
  }
}

/* ---------- Form ---------- */
function paintPreview(): void {
  const box = $('#spv');
  const image = box.querySelector('img');
  if (image) image.src = previewUrl || img;
  const t = box.querySelector('b');
  const e = box.querySelector('small');
  if (t) t.textContent = $<HTMLInputElement>('#stitle').value || 'Judul slide';
  if (e) e.textContent = $<HTMLInputElement>('#seyebrow').value;
}
function setPending(blob: Blob | null): void {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  pending = blob;
  previewUrl = blob ? URL.createObjectURL(blob) : '';
}

function openForm(s?: Slide): void {
  $<HTMLFormElement>('#sf').reset();
  $err().forEach((x) => { x.textContent = ''; });
  setPending(null);
  img = s?.img ?? '';
  $<HTMLInputElement>('#sid').value = s ? String(s.id) : '';
  $('#s-ftitle').textContent = s ? 'Edit Slide' : 'Tambah Slide';
  if (s) {
    $<HTMLInputElement>('#seyebrow').value = s.eyebrow;
    $<HTMLInputElement>('#stitle').value = s.title;
    $<HTMLInputElement>('#stext').value = s.text;
    $<HTMLInputElement>('#sbtn').value = s.btn;
    $<HTMLInputElement>('#slink').value = s.link;
    $<HTMLInputElement>('#surl').value = s.img;
  }
  paintPreview();
  $('#s-formcard').hidden = false;
  $('#s-formcard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
const closeForm = (): void => { $('#s-formcard').hidden = true; setPending(null); };

function messageFor(f: Field): string {
  const v = f.validity;
  if (v.valid) return '';
  if (v.valueMissing) return 'Wajib diisi';
  if (v.patternMismatch) return f.id === 'slink' ? 'Gunakan #bagian, /halaman, atau https://…' : 'Harus diawali https:// atau /';
  return 'Terlalu pendek atau terlalu panjang';
}

/* ---------- Init ---------- */
export async function initSlideAdmin(): Promise<void> {
  const form = $<HTMLFormElement>('#sf');
  const file = $<HTMLInputElement>('#sfile');
  const url = $<HTMLInputElement>('#surl');
  const imgErr = $('#simg-err');
  const submit = form.querySelector<HTMLButtonElement>('button:not([type])');

  $('#s-new').addEventListener('click', () => {
    if (slides.length >= MAX_SLIDES) { toast(`Maksimal ${MAX_SLIDES} slide`); return; }
    openForm();
  });
  $('#scancel').addEventListener('click', closeForm);

  $('#slist').addEventListener('click', async (e: MouseEvent) => {
    const d = (e.target as HTMLElement).dataset;
    if (d.sup) await move(Number(d.sup), -1);
    if (d.sdown) await move(Number(d.sdown), 1);
    if (d.sedit) {
      const s = slides.find((x) => x.id === Number(d.sedit));
      if (s) openForm(s);
    }
    if (d.sdel) {
      if (slides.length <= 1) { toast('Minimal harus ada 1 slide'); return; }
      if (!confirm('Hapus slide ini?')) return;
      try {
        await deleteSlide(Number(d.sdel));
        slides = slides.filter((x) => x.id !== Number(d.sdel));
        vt(renderSlideList);
        toast('Slide dihapus');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Gagal menghapus');
      }
    }
  });

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    imgErr.textContent = '';
    if (f.size > MAX_UPLOAD) { imgErr.textContent = 'Ukuran file maksimal 15 MB'; return; }
    try {
      setPending(await compress(f));
      url.value = '';
      paintPreview();
    } catch (err) {
      imgErr.textContent = err instanceof Error ? err.message : 'Gagal membaca gambar';
    }
  });
  url.addEventListener('input', () => {
    const v = url.value.trim();
    if (/^(https:\/\/|\/).+/.test(v)) { img = v; setPending(null); file.value = ''; imgErr.textContent = ''; paintPreview(); }
  });
  ['#stitle', '#seyebrow'].forEach((id) => $(id).addEventListener('input', paintPreview));

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();
    let ok = true;
    document.querySelectorAll<Field>('#sf input:not([type=hidden]):not([type=file])').forEach((f) => {
      const msg = messageFor(f);
      const slot = f.parentElement?.querySelector('.err');
      if (slot) slot.textContent = msg;
      if (msg) ok = false;
    });
    if (!img && !pending) { imgErr.textContent = 'Pilih gambar atau isi URL gambar'; ok = false; }
    if (!ok) return;

    if (submit) submit.disabled = true;
    try {
      const imageUrl = pending ? await uploadImage(pending) : img;
      const data: Omit<Slide, 'id'> = {
        img: imageUrl,
        eyebrow: $<HTMLInputElement>('#seyebrow').value.trim(),
        title: $<HTMLInputElement>('#stitle').value.trim(),
        text: $<HTMLInputElement>('#stext').value.trim(),
        btn: $<HTMLInputElement>('#sbtn').value.trim(),
        link: safeLink($<HTMLInputElement>('#slink').value.trim()),
      };
      const id = Number($<HTMLInputElement>('#sid').value);
      const saved = id ? await updateSlide(id, data) : await createSlide(data);
      slides = id ? slides.map((s) => (s.id === id ? saved : s)) : [...slides, saved];
      vt(renderSlideList);
      toast('Slide tersimpan ✓');
      closeForm();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal menyimpan slide');
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  try {
    await reload();
  } catch (err) {
    toast(err instanceof Error ? err.message : 'Gagal memuat slide');
  }
}
