# Pustaka Nusa (TypeScript)

- src/      -> kode frontend TypeScript (shared, landing, login, admin)
- api/      -> fungsi serverless TypeScript (login, logout, admin, _auth)
- scripts/  -> build.ts (esbuild: src -> public/*.js dan private/app.js)
- public/   -> situs publik (index.html, common.css + hasil build)
- private/  -> admin.html, login.html, app.js (hasil build) - hanya dilayani setelah login

Perintah:
- npm install
- npm run typecheck   (cek tipe)
- npm run build       (typecheck + bundel)

Deploy Vercel: push ke GitHub / `npx vercel`. Vercel otomatis menjalankan `npm run build`.
Set Environment Variables: ADMIN_PASSWORD dan SESSION_SECRET (mis. `openssl rand -hex 32`).
