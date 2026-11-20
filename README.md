# Pustaka Nusa (TypeScript + Prisma Postgres + Vercel)

```
src/       frontend TypeScript (landing, login, admin, klien API, slider)
api/       fungsi serverless Vercel (TypeScript); api/_lib = auth, sesi, validasi, klien Prisma
prisma/    schema.prisma, migrations/, seed.ts
scripts/   build.ts (esbuild), create-admin.ts
private/   admin.html (+ app.js hasil build) - hanya dilayani ke admin yang sudah login
public/    situs publik: index.html, login.html, common.css, img/
```

## Alur akses
- `/`       publik: katalog + slider (data dari database lewat `/api/catalog`)
- `/login`  halaman login terpisah (email + kata sandi)
- `/admin`  hanya untuk User dengan `role = ADMIN` dan `active = true`; selain itu diarahkan ke `/login`.
            Semua `/api/books|slides|users|upload` juga menolak non-admin (401).

## Keamanan
- Kata sandi di-hash dengan scrypt; sesi disimpan di tabel `Session` (hanya hash token), cookie HttpOnly + Secure + SameSite=Strict, berlaku 12 jam.
- Akun terkunci 15 menit setelah 5 kali gagal login. Menonaktifkan admin langsung memutus sesinya.

## Setup (urutan)
1. Push ke GitHub, lalu import repo di Vercel (build pertama boleh gagal karena database belum terhubung).
2. Vercel -> Storage -> Create Database -> **Prisma Postgres** -> Connect ke project
   (menyetel `DATABASE_URL`, `DATABASE_URL_POOLED`, `POSTGRES_URL`, `PRISMA_DATABASE_URL`).
3. Redeploy. Build menjalankan `prisma migrate deploy` (membuat tabel) lalu bundel frontend.
4. Di komputer Anda:
   ```bash
   npm install
   npx vercel link
   npx vercel env pull .env.local
   npm run db:seed                     # isi data awal (sekali saja)
   ADMIN_EMAIL=anda@contoh.com ADMIN_PASSWORD='kata-sandi-min-10-karakter' ADMIN_NAME='Nama Anda' npm run create-admin
   ```
5. Buka `/login` dan masuk.

## Perintah
`npm run typecheck` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run db:studio` · `npm run create-admin`
