-- Hide recipe from “Recently imported” without deleting it (still in Favorites etc.)
alter table public.recipes
  add column if not exists hidden_from_recent_at timestamptz;
