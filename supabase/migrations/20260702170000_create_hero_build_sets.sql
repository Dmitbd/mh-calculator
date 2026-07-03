create table if not exists public.hero_build_sets (
  hero_id text not null,
  status text not null check (status in ('draft', 'published')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (hero_id, status)
);

create index if not exists hero_build_sets_status_idx
  on public.hero_build_sets (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_hero_build_sets_updated_at on public.hero_build_sets;
create trigger set_hero_build_sets_updated_at
before update on public.hero_build_sets
for each row execute function public.set_updated_at();

alter table public.hero_build_sets enable row level security;

drop policy if exists "Anyone can read published hero build sets"
  on public.hero_build_sets;
create policy "Anyone can read published hero build sets"
  on public.hero_build_sets
  for select
  using (status = 'published');

drop policy if exists "Authenticated admins can read all hero build sets"
  on public.hero_build_sets;
create policy "Authenticated admins can read all hero build sets"
  on public.hero_build_sets
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated admins can insert hero build sets"
  on public.hero_build_sets;
create policy "Authenticated admins can insert hero build sets"
  on public.hero_build_sets
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated admins can update hero build sets"
  on public.hero_build_sets;
create policy "Authenticated admins can update hero build sets"
  on public.hero_build_sets
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated admins can delete hero build sets"
  on public.hero_build_sets;
create policy "Authenticated admins can delete hero build sets"
  on public.hero_build_sets
  for delete
  to authenticated
  using (auth.uid() is not null);
