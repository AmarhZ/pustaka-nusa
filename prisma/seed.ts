import { config } from 'dotenv';
import { prisma } from '../api/_lib/db';

config({ path: ['.env.local', '.env'], quiet: true });

const books = [
  ['Laskar Pelangi', 'Andrea Hirata', 'Fiksi', 2005, 5, '9789793062792'],
  ['Bumi Manusia', 'Pramoedya A. Toer', 'Fiksi', 1980, 3, '9789799731234'],
  ['Sapiens', 'Yuval Noah Harari', 'Sejarah', 2011, 0, '9786020322056'],
  ['Kosmos', 'Carl Sagan', 'Sains', 1980, 4, '9789791234567'],
  ['Clean Code', 'Robert C. Martin', 'Teknologi', 2008, 6, '9780132350884'],
  ['Si Kancil dan Buaya', 'Tim Dongeng Nusantara', 'Anak', 2015, 9, '9786021111111'],
  ['Atomic Habits', 'James Clear', 'Bisnis', 2018, 2, '9786020633176'],
  ['Sejarah Indonesia Modern', 'M.C. Ricklefs', 'Sejarah', 1981, 2, '9789792222222'],
  ['Brief Answers', 'Stephen Hawking', 'Sains', 2018, 3, '9786020000003'],
  ['Eloquent JavaScript', 'Marijn Haverbeke', 'Teknologi', 2018, 4, '9781593279509'],
] as const;

const slides = [
  ['/img/slide-1.svg', 'Perpustakaan Modern', 'Jelajahi dunia lewat halaman demi halaman', 'Lebih dari seribu judul, ruang baca nyaman, dan peminjaman digital.', 'Cari Buku', '#cari'],
  ['/img/slide-2.svg', 'Ruang Baca', 'Tempat tenang untuk fokus dan berimajinasi', 'Buka setiap hari lengkap dengan Wi-Fi, colokan, dan sudut baca yang hangat.', 'Lihat Jam Layanan', '#info'],
  ['/img/slide-3.svg', 'Layanan Digital', 'Pinjam dan perpanjang kapan saja', 'Pesan buku dari rumah, ambil saat Anda siap. Mudah dan tanpa antre.', 'Telusuri Katalog', '#cari'],
  ['/img/slide-4.svg', 'Program Anak', 'Mengenalkan cinta membaca sejak dini', 'Dongeng akhir pekan dan klub baca anak, gratis untuk semua anggota.', 'Pelajari Program', '#info'],
] as const;

async function main(): Promise<void> {
  const db = prisma();
  if ((await db.book.count()) === 0) {
    await db.book.createMany({
      data: books.map(([title, author, category, year, stock, isbn]) => ({ title, author, category, year, stock, isbn })),
    });
    console.log(`✔ ${books.length} buku ditambahkan`);
  } else console.log('• Buku sudah ada, dilewati');

  if ((await db.slide.count()) === 0) {
    await db.slide.createMany({
      data: slides.map(([imageUrl, eyebrow, title, body, buttonLabel, buttonLink], i) => ({
        position: i + 1, imageUrl, eyebrow, title, body, buttonLabel, buttonLink,
      })),
    });
    console.log(`✔ ${slides.length} slide ditambahkan`);
  } else console.log('• Slide sudah ada, dilewati');
}

main()
  .catch((e: unknown) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma().$disconnect());
