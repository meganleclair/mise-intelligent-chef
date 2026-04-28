-- ============================================================
-- Mise — Complete Database Schema
-- Run this once in your Supabase SQL Editor:
--   https://uwvoquxurtidufkwrinf.supabase.co → SQL Editor → New Query
-- Safe to re-run (IF NOT EXISTS / DO $$ guards throughout)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Profiles are self') then
    create policy "Profiles are self" on public.profiles
      for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- ── recipes ───────────────────────────────────────────────────
create table if not exists public.recipes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  summary        text,
  image_url      text,
  source_url     text not null,
  servings       integer not null default 4,
  ingredients    jsonb not null default '[]'::jsonb,
  steps          jsonb not null default '[]'::jsonb,
  prep_items     jsonb not null default '[]'::jsonb,
  favorite       boolean not null default false,
  rating         smallint,
  spoonacular_id integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Add rating constraint idempotently
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_rating_check' and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_rating_check
      check (rating is null or (rating >= 1 and rating <= 5));
  end if;
end $$;

-- Dismiss from “Recently imported” without deleting the recipe
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes' and column_name = 'hidden_from_recent_at'
  ) then
    alter table public.recipes add column hidden_from_recent_at timestamptz;
  end if;
end $$;

create index if not exists recipes_user_created on public.recipes (user_id, created_at desc);

alter table public.recipes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='recipes' and policyname='Recipes own row') then
    create policy "Recipes own row" on public.recipes
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ── recipe_modifications ──────────────────────────────────────
create table if not exists public.recipe_modifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  recipe_id         uuid not null references public.recipes (id) on delete cascade,
  ingredient_key    text not null,
  replacement_label text not null,
  impact_note       text,
  created_at        timestamptz not null default now(),
  unique (recipe_id, ingredient_key)
);

alter table public.recipe_modifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='recipe_modifications' and policyname='Modifications own row') then
    create policy "Modifications own row" on public.recipe_modifications
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ── cook_sessions ─────────────────────────────────────────────
create table if not exists public.cook_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  recipe_id         uuid not null references public.recipes (id) on delete cascade,
  current_step_index integer not null default 0,
  servings          integer,
  timer_state       jsonb,
  started_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index if not exists cook_sessions_user_incomplete
  on public.cook_sessions (user_id)
  where completed_at is null;

alter table public.cook_sessions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='cook_sessions' and policyname='Sessions own row') then
    create policy "Sessions own row" on public.cook_sessions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists cook_sessions_updated_at on public.cook_sessions;
create trigger cook_sessions_updated_at
  before update on public.cook_sessions
  for each row execute function public.set_updated_at();
