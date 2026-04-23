-- Personal rating after cooking (1–5), optional
alter table public.recipes
  add column if not exists rating smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_rating_check'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_rating_check
      check (rating is null or (rating >= 1 and rating <= 5));
  end if;
end $$;
