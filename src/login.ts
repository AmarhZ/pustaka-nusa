import { ApiError, login } from './api';
import { $, initTheme } from './shared';

const form = $<HTMLFormElement>('#f');
const email = $<HTMLInputElement>('#email');
const pass = $<HTMLInputElement>('#p');
const err = $('#e');
const btn = $<HTMLButtonElement>('#go');

form.addEventListener('submit', async (ev: SubmitEvent) => {
  ev.preventDefault();
  err.textContent = '';
  btn.disabled = true;
  try {
    await login(email.value, pass.value);
    location.replace('/admin');
  } catch (e) {
    err.textContent = e instanceof ApiError ? e.message : 'Jaringan bermasalah. Coba lagi.';
    pass.value = '';
    btn.disabled = false;
  }
});
initTheme();
