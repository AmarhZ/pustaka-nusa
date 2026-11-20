import { config } from 'dotenv';
import { prisma } from '../api/_lib/db';
import { hashPassword } from '../api/_lib/password';

config({ path: ['.env.local', '.env'], quiet: true });

/**
 * Buat admin baru, atau reset kata sandi admin yang sudah ada.
 *   ADMIN_EMAIL=you@contoh.com ADMIN_PASSWORD='kata-sandi-panjang' ADMIN_NAME='Nama' npm run create-admin
 */
async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? process.argv[2] ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? '';
  const name = (process.env.ADMIN_NAME ?? process.argv[4] ?? 'Admin').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL tidak valid');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD minimal 10 karakter');

  const passwordHash = await hashPassword(password);
  const user = await prisma().user.upsert({
    where: { email },
    create: { email, name, role: 'ADMIN', passwordHash, active: true },
    update: { name, role: 'ADMIN', passwordHash, active: true, failedLogins: 0, lockedUntil: null },
    select: { email: true, role: true },
  });
  console.log(`✔ Admin siap: ${user.email} (${user.role})`);
}

main()
  .catch((e: unknown) => { console.error('✖', e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma().$disconnect());
