-- ============================================================
-- Pustaka Nusa - skema database Supabase
-- Jalankan seluruh isi file ini di: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ---------- Tabel ----------
create table if not exists public.books (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) between 3 and 200),
  author     text not null check (char_length(author) between 3 and 120),
  category   text not null check (category in ('Fiksi','Sains','Sejarah','Teknologi','Anak','Bisnis')),
  year       int  not null check (year between 1900 and 2100),
  stock      int  not null default 0 check (stock between 0 and 999),
  isbn       text not null check (isbn ~ '^([0-9]{10}|[0-9]{13})$'),
  created_at timestamptz not null default now()
);
create index if not exists books_category_idx on public.books (category);

create table if not exists public.slides (
  id           bigint generated always as identity primary key,
  position     int  not null default 0,
  image_url    text not null check (image_url ~ '^(https://|/)'),
  eyebrow      text not null default '' check (char_length(eyebrow) <= 40),
  title        text not null check (char_length(title) between 3 and 80),
  body         text not null default '' check (char_length(body) <= 160),
  button_label text not null check (char_length(button_label) between 1 and 30),
  button_link  text not null check (button_link ~ '^(#|/|https?://)'),
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  role       text not null default 'member' check (role in ('admin','staff','member')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.books    enable row level security;
alter table public.slides   enable row level security;
alter table public.profiles enable row level security;

-- Katalog & banner boleh dibaca publik (read-only)
drop policy if exists "books_public_read"  on public.books;
drop policy if exists "slides_public_read" on public.slides;
create policy "books_public_read"  on public.books  for select to anon, authenticated using (true);
create policy "slides_public_read" on public.slides for select to anon, authenticated using (true);

-- profiles: TANPA policy untuk anon/authenticated => hanya server (service role) yang bisa akses
revoke all on public.profiles from anon, authenticated;
revoke insert, update, delete on public.books, public.slides from anon, authenticated;

-- ---------- Profil otomatis saat ada user baru ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Buat profil untuk user yang sudah ada
insert into public.profiles (id, email, full_name)
select id, email, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- ---------- Storage untuk foto banner ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ---------- Data awal ----------
insert into public.books (title, author, category, year, stock, isbn)
select * from (values
  ('Laskar Pelangi','Andrea Hirata','Fiksi',2005,5,'9789793062792'),
  ('Bumi Manusia','Pramoedya A. Toer','Fiksi',1980,3,'9789799731234'),
  ('Sapiens','Yuval Noah Harari','Sejarah',2011,0,'9786020322056'),
  ('Kosmos','Carl Sagan','Sains',1980,4,'9789791234567'),
  ('Clean Code','Robert C. Martin','Teknologi',2008,6,'9780132350884'),
  ('Si Kancil dan Buaya','Tim Dongeng Nusantara','Anak',2015,9,'9786021111111'),
  ('Atomic Habits','James Clear','Bisnis',2018,2,'9786020633176'),
  ('Sejarah Indonesia Modern','M.C. Ricklefs','Sejarah',1981,2,'9789792222222'),
  ('Brief Answers','Stephen Hawking','Sains',2018,3,'9786020000003'),
  ('Eloquent JavaScript','Marijn Haverbeke','Teknologi',2018,4,'9781593279509')
) as v(title, author, category, year, stock, isbn)
where not exists (select 1 from public.books);

insert into public.slides (position, image_url, eyebrow, title, body, button_label, button_link)
select * from (values
  (1,'/img/slide-1.svg','Perpustakaan Modern','Jelajahi dunia lewat halaman demi halaman','Lebih dari seribu judul, ruang baca nyaman, dan peminjaman digital.','Cari Buku','#cari'),
  (2,'/img/slide-2.svg','Ruang Baca','Tempat tenang untuk fokus dan berimajinasi','Buka setiap hari lengkap dengan Wi-Fi, colokan, dan sudut baca yang hangat.','Lihat Jam Layanan','#info'),
  (3,'/img/slide-3.svg','Layanan Digital','Pinjam dan perpanjang kapan saja','Pesan buku dari rumah, ambil saat Anda siap. Mudah dan tanpa antre.','Telusuri Katalog','#cari'),
  (4,'/img/slide-4.svg','Program Anak','Mengenalkan cinta membaca sejak dini','Dongeng akhir pekan dan klub baca anak, gratis untuk semua anggota.','Pelajari Program','#info')
) as v(position, image_url, eyebrow, title, body, button_label, button_link)
where not exists (select 1 from public.slides);

-- ============================================================
-- LANGKAH WAJIB SETELAH ITU: jadikan akun Anda admin
-- 1) Authentication -> Users -> Add user (email + password, centang Auto Confirm)
-- 2) Jalankan (ganti emailnya):
--    update public.profiles set role = 'admin' where email = 'admin@contoh.com';
-- ============================================================
