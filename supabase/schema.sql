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
