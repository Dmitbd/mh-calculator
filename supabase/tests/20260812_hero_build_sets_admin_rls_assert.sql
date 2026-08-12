begin;

create function pg_temp.normalize_policy_expression(raw_expression text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    replace(
      regexp_replace(
        regexp_replace(
          lower(coalesce(raw_expression, '')),
          '[[:space:]]+',
          '',
          'g'
        ),
        '[()]',
        '',
        'g'
      ),
      '::text',
      ''
    ),
    '^select',
    ''
  );
$$;

do $$
declare
  admin_expression constant text :=
    'auth.jwt()->''app_metadata''->>''role''=''admin''';
  published_expression constant text := 'status=''published''';
  policy_count integer;
  policy_record record;
begin
  if pg_temp.normalize_policy_expression(
    '((select auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'') or true'
  ) = admin_expression then
    raise exception 'policy expression normalizer accepts a permissive clause';
  end if;

  if pg_temp.normalize_policy_expression(
    'status = ''published'' or true'
  ) = published_expression then
    raise exception 'published policy normalizer accepts a permissive clause';
  end if;

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
    or pg_temp.normalize_policy_expression(policy_record.qual)
      is distinct from published_expression
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
    or pg_temp.normalize_policy_expression(policy_record.qual)
      is distinct from admin_expression
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
    or pg_temp.normalize_policy_expression(policy_record.with_check)
      is distinct from admin_expression then
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
    or pg_temp.normalize_policy_expression(policy_record.qual)
      is distinct from admin_expression
    or pg_temp.normalize_policy_expression(policy_record.with_check)
      is distinct from admin_expression then
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
    or pg_temp.normalize_policy_expression(policy_record.qual)
      is distinct from admin_expression
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
