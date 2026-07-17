-- =========================================================
-- Photography section — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL → New query).
-- Creates the two tables used by the photography feature.
-- Policies live in policies.sql (run that second).
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- photographs ----------
create table if not exists public.photographs (
  id                  uuid primary key default gen_random_uuid(),

  image_url           text not null,          -- optimized display image (alias: displayImageUrl)
  display_image_url   text,                    -- explicit optimized display url
  original_image_url  text not null,          -- preserved original
  thumbnail_url       text not null,
  high_resolution_url text,
  file_name           text,

  title               text,
  caption             text,
  alt_text            text not null default '',
  category            text,

  original_width      int  not null default 0,
  original_height     int  not null default 0,

  grid_x              int  not null default 0,
  grid_y              int  not null default 0,
  grid_width          int  not null default 1,
  grid_height         int  not null default 1,

  focal_point_x       real not null default 0.5,
  focal_point_y       real not null default 0.5,

  sort_order          int  not null default 0,
  is_published        boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists photographs_published_idx
  on public.photographs (is_published, sort_order);

-- ---------- photography_settings (single row) ----------
create table if not exists public.photography_settings (
  id                   int primary key default 1,
  title                text not null default 'Photography',
  description          text,
  owner_name           text,
  bio                  text,
  profile_photo_url    text,
  contact_email        text,
  social_links         jsonb not null default '[]'::jsonb,   -- [{label,url}]
  categories           jsonb not null default '[]'::jsonb,   -- ["Landscape", ...]
  copyright_text       text,
  default_grid_gap     int  not null default 16,
  default_border_radius int not null default 16,
  updated_at           timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.photography_settings (id, title, description)
values (1, 'Photography', 'A personal collection.')
on conflict (id) do nothing;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists photographs_touch on public.photographs;
create trigger photographs_touch before update on public.photographs
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.photography_settings;
create trigger settings_touch before update on public.photography_settings
  for each row execute function public.touch_updated_at();

-- =========================================================
-- Focal-point zoom + aspect ratio/dominant-color (additive, safe to
-- re-run). image_url / display_image_url / original_image_url /
-- thumbnail_url / high_resolution_url / original_width / original_height
-- are UNCHANGED columns — no frontend field-name changes needed.
-- =========================================================
alter table public.photographs
  add column if not exists focal_zoom     real not null default 1,   -- pre-existing crop/zoom feature, was missing from this table
  add column if not exists dominant_color text,                      -- '#rrggbb', from Cloudinary's upload response
  add column if not exists aspect_ratio   real;                      -- width/height, for layout-stable rendering

-- =========================================================
-- Cloudinary migration (additive + cleanup, safe to re-run).
-- Replaces the never-activated Cloudflare R2 columns below — this app's
-- `backend` config never left 'local' mode, so no row was ever populated
-- via the R2 path; dropping them is a clean removal, not a data migration.
-- (If you're unsure whether any row might have R2 data, run
--  `select count(*) from public.photographs where object_key is not null;`
--  first — it should be 0 before running the drops below.)
-- =========================================================
drop index if exists photographs_object_key_idx;
alter table public.photographs
  drop column if exists object_key,
  drop column if exists variants,
  drop column if exists placeholder;

alter table public.photographs
  add column if not exists cloudinary_public_id text,                 -- Cloudinary public_id of the uploaded asset
  add column if not exists cloudinary_version   int,                  -- Cloudinary asset version (kept for completeness; not used for cache-busting since public_ids are never reused/overwritten)
  add column if not exists secure_url           text,                 -- Cloudinary's https delivery URL for the original upload
  add column if not exists format               text,                 -- 'jpg' | 'png' | 'webp' | 'avif'
  add column if not exists bytes                bigint,               -- original file size, from Cloudinary's response
  add column if not exists book                 text,                 -- optional grouping field, e.g. for a "Story Worlds" category
  add column if not exists featured             boolean not null default false;

create unique index if not exists photographs_cloudinary_public_id_idx
  on public.photographs (cloudinary_public_id) where cloudinary_public_id is not null;
