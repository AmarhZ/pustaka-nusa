import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Perintah CLI (migrate, studio) memakai koneksi langsung. Kosong saat `prisma generate` di mesin tanpa .env.
    url: process.env.DATABASE_URL ?? '',
  },
});
