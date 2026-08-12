drop policy if exists "Authenticated admins can read all hero build sets"
  on public.hero_build_sets;
drop policy if exists "Authenticated admins can insert hero build sets"
  on public.hero_build_sets;
drop policy if exists "Authenticated admins can update hero build sets"
  on public.hero_build_sets;
drop policy if exists "Authenticated admins can delete hero build sets"
  on public.hero_build_sets;

drop policy if exists "Admins can read all hero build sets"
  on public.hero_build_sets;
create policy "Admins can read all hero build sets"
  on public.hero_build_sets
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can insert hero build sets"
  on public.hero_build_sets;
create policy "Admins can insert hero build sets"
  on public.hero_build_sets
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update hero build sets"
  on public.hero_build_sets;
create policy "Admins can update hero build sets"
  on public.hero_build_sets
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete hero build sets"
  on public.hero_build_sets;
create policy "Admins can delete hero build sets"
  on public.hero_build_sets
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
