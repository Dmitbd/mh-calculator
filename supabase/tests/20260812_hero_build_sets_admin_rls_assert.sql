begin;

do $$
declare
  policy_count integer;
  policy_record record;
begin
  if not exists (
    select 1
    from pg_class
    where oid = 'public.hero_build_sets'::regclass
      and relrowsecurity
  ) then
    raise exception 'row level security is not enabled for hero_build_sets';
  end if;

  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_build_sets';

  if policy_count is distinct from 5 then
    raise exception 'expected exactly 5 hero_build_sets policies, found %', policy_count;
  end if;

  select *
  into policy_record
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_build_sets'
    and policyname = 'Anyone can read published hero build sets';

  if not found
    or policy_record.cmd is distinct from 'SELECT'
    or policy_record.roles is distinct from array['public']::name[]
    or coalesce(policy_record.qual, '') not like '%status%published%'
    or policy_record.with_check is not null then
    raise exception 'published read policy does not limit public access to published rows';
  end if;

  select *
  into policy_record
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_build_sets'
    and policyname = 'Admins can read all hero build sets';

  if not found
    or policy_record.cmd is distinct from 'SELECT'
    or policy_record.roles is distinct from array['authenticated']::name[]
    or coalesce(policy_record.qual, '') not like '%auth.jwt()%app_metadata%role%admin%'
    or policy_record.with_check is not null then
    raise exception 'admin read policy does not require the app_metadata admin claim';
  end if;

  select *
  into policy_record
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_build_sets'
    and policyname = 'Admins can insert hero build sets';

  if not found
    or policy_record.cmd is distinct from 'INSERT'
    or policy_record.roles is distinct from array['authenticated']::name[]
    or policy_record.qual is not null
    or coalesce(policy_record.with_check, '') not like '%auth.jwt()%app_metadata%role%admin%' then
    raise exception 'admin insert policy does not require the app_metadata admin claim';
  end if;

  select *
  into policy_record
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_build_sets'
    and policyname = 'Admins can update hero build sets';

  if not found
    or policy_record.cmd is distinct from 'UPDATE'
    or policy_record.roles is distinct from array['authenticated']::name[]
    or coalesce(policy_record.qual, '') not like '%auth.jwt()%app_metadata%role%admin%'
    or coalesce(policy_record.with_check, '') not like '%auth.jwt()%app_metadata%role%admin%' then
    raise exception 'admin update policy does not require the app_metadata admin claim';
  end if;

  select *
  into policy_record
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_build_sets'
    and policyname = 'Admins can delete hero build sets';

  if not found
    or policy_record.cmd is distinct from 'DELETE'
    or policy_record.roles is distinct from array['authenticated']::name[]
    or coalesce(policy_record.qual, '') not like '%auth.jwt()%app_metadata%role%admin%'
    or policy_record.with_check is not null then
    raise exception 'admin delete policy does not require the app_metadata admin claim';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"app_metadata":{"role":"admin"}}',
    true
  );

  if ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') is not true then
    raise exception 'admin app_metadata claim is not recognized';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"app_metadata":{"role":"user"}}',
    true
  );

  if ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') is not false then
    raise exception 'non-admin app_metadata claim is accepted';
  end if;
end;
$$;

rollback;
