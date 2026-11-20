import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const BUCKET = 'banners';

function need(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Environment variable ${name} belum diatur`);
  return value;
}

export const supabaseUrl = (): string =>
  need(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, 'SUPABASE_URL');

const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;

let service: SupabaseClient | undefined;
/** Client dengan service role: HANYA dipakai di server setelah memastikan pemanggil adalah admin. */
export function db(): SupabaseClient {
  service ??= createClient(supabaseUrl(), need(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'), opts);
  return service;
}

/** Client anon: tunduk pada RLS (hanya baca katalog) dan dipakai untuk proses login. */
export function anonClient(): SupabaseClient {
  return createClient(
    supabaseUrl(),
    need(process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY'),
    opts,
  );
}

/** Hapus file di bucket banner jika URL berasal dari storage kita (best-effort). */
export async function removeIfOurs(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const prefix = `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return;
  const path = decodeURIComponent(url.slice(prefix.length).split('?')[0] ?? '');
  if (path) await db().storage.from(BUCKET).remove([path]).catch(() => undefined);
}
