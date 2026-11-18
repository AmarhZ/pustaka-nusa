import { $, initTheme } from './shared';

const form = $<HTMLFormElement>('#f');
const pass = $<HTMLInputElement>('#p');
const err = $('#e');

form.addEventListener('submit', async (ev: SubmitEvent) => {
  ev.preventDefault();
  err.textContent = '';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass.value }),
    });
    if (res.ok) location.reload();
    else err.textContent = res.status === 401 ? 'Kata sandi salah.' : `Gagal masuk (kode ${res.status}).`;
  } catch {
    err.textContent = 'Jaringan bermasalah.';
  }
});
initTheme();
