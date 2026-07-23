-- Replaces the single-ingredient swap model (recipe_modifications) with a
-- recipe-scoped nutrition chat: one "current version" per recipe per user.
drop table if exists public.recipe_modifications;

alter table public.recipes add column if not exists has_cooked boolean not null default false;
alter table public.recipes add column if not exists first_cooked_at timestamptz;

create table if not exists public.recipe_nutrition_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings integer not null,
  ingredient_overrides jsonb not null default '[]'::jsonb,
  macros jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.recipe_nutrition_sessions enable row level security;

create policy "Nutrition sessions own row" on public.recipe_nutrition_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists recipe_nutrition_sessions_updated_at on public.recipe_nutrition_sessions;
create trigger recipe_nutrition_sessions_updated_at
  before update on public.recipe_nutrition_sessions
  for each row execute function public.set_updated_at();

grant all on public.recipe_nutrition_sessions to authenticated;
