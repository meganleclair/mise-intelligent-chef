-- Grant Data API access to all tables
-- Supabase no longer auto-exposes public schema tables to the Data API
-- (PostgREST / supabase-js). Explicit GRANTs are required.
-- Deadline for existing projects: October 30 2026.
-- Ref: https://github.com/orgs/supabase/discussions/45329

grant all on public.profiles             to authenticated;
grant all on public.recipes              to authenticated;
grant all on public.recipe_modifications to authenticated;
grant all on public.cook_sessions        to authenticated;
