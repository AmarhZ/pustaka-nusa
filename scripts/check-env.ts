import { config } from 'dotenv';

config({ path: ['.env.local', '.env'], quiet: true });

const url = process.env.DATABASE_URL ?? '';

if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error(`
✖ DATABASE_URL belum diatur (atau bukan alamat postgres://).

Cara memperbaiki di Vercel:
  1. Buka project -> tab Storage -> Create Database -> Prisma Postgres -> Connect ke project ini
     (centang Production dan Preview).
  2. Cek Settings -> Environment Variables: harus ada DATABASE_URL.
  3. Deployments -> ⋯ -> Redeploy (deployment lama tidak menerima variabel baru).
`);
  process.exit(1);
}
