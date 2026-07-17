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
--     touching the database (see netlify/functions/_lib.js).
--   * Image binaries live in Cloudinary, not Supabase Storage — there
--     is no storage bucket for this app; Cloudinary uploads/deletes
--     are gated by the same ADMIN_EMAIL check, server-side, using a
--     signed request (see netlify/functions/_cloudinary.js).
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
