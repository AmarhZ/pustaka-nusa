import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const g = globalThis as { __prisma?: PrismaClient };

function create(): PrismaClient {
  // Prisma Postgres di Vercel: pakai koneksi pooled untuk trafik aplikasi, fallback ke DATABASE_URL.
  const connectionString = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL belum diatur');
  const max = Number(process.env.DB_POOL_MAX) || 3;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max, idleTimeoutMillis: 10_000 }) });
}

/** Satu instance Prisma Client per instance fungsi serverless. */
export const prisma = (): PrismaClient => (g.__prisma ??= create());
