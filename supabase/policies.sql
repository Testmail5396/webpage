-- =========================================================
-- Photography section — Row Level Security policies
-- Run AFTER schema.sql.
--
-- Security model (defense in depth):
--   * The PUBLIC (anon) role may only READ published photographs
--     and the settings row. No writes at all.
--   * All WRITES happen through the Netlify serverless functions
--     using the SERVICE ROLE key, which bypasses RLS. Those
--     functions verify the caller's email == ADMIN_EMAIL BEFORE
--     touching the database (see netlify/functions/_auth.js).
--   * The storage bucket is public-read, admin-write (write only
--     via the service role in the upload function).
-- =========================================================

alter table public.photographs         enable row level security;
alter table public.photography_settings enable row level security;

-- ---- photographs: public may read only published rows ----
drop policy if exists "public read published" on public.photographs;
create policy "public read published"
  on public.photographs
  for select
  to anon, authenticated
  using (is_published = true);

-- No insert/update/delete policies for anon/authenticated →
-- those operations are denied for everyone except the service role
-- (which bypasses RLS and is only reachable via the server functions).

-- ---- settings: public may read the single row ----
drop policy if exists "public read settings" on public.photography_settings;
create policy "public read settings"
  on public.photography_settings
  for select
  to anon, authenticated
  using (true);

-- =========================================================
-- STORAGE
-- Create a bucket named 'photography' (public) in the dashboard,
-- or with the snippet below. Public read; writes only via the
-- service role in the upload function.
-- =========================================================
insert into storage.buckets (id, name, public)
values ('photography', 'photography', true)
on conflict (id) do nothing;

-- Public read of objects in the photography bucket.
drop policy if exists "photography public read" on storage.objects;
create policy "photography public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'photography');

-- Note: no anon/authenticated INSERT/UPDATE/DELETE policies on
-- storage.objects for this bucket → uploads/deletes are only
-- possible with the service role key inside the server functions.
