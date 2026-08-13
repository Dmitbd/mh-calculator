begin;

alter table public.hero_build_sets
  add column if not exists revision bigint not null default 1;

alter table public.hero_build_sets
  drop constraint if exists hero_build_sets_revision_positive;
alter table public.hero_build_sets
  add constraint hero_build_sets_revision_positive check (revision > 0);

create table if not exists public.hero_build_set_revisions (
  id bigint generated always as identity primary key,
  hero_id text not null,
  revision bigint not null,
  event_type text not null check (
    event_type in (
      'migrated',
      'created_draft',
      'updated_draft',
      'published',
      'updated_published',
      'restored_published'
    )
  ),
  previous_revision bigint,
  previous_status text check (previous_status in ('draft', 'published')),
  previous_payload jsonb,
  status text not null check (status in ('draft', 'published')),
  payload jsonb not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  unique (hero_id, revision),
  check (
    (previous_revision is null and previous_status is null and previous_payload is null)
    or
    (previous_revision is not null and previous_status is not null and previous_payload is not null)
  )
);

insert into public.hero_build_set_revisions (
  hero_id,
  revision,
  event_type,
  status,
  payload,
  updated_by,
  created_at
)
select
  hero_id,
  revision,
  'migrated',
  status,
  payload,
  updated_by,
  updated_at
from public.hero_build_sets
on conflict (hero_id, revision) do nothing;

create or replace function public.prevent_hero_build_set_revision_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Hero build set revision history is immutable.'
    using errcode = '55000';
end;
$$;

drop trigger if exists prevent_hero_build_set_revision_changes
  on public.hero_build_set_revisions;
create trigger prevent_hero_build_set_revision_changes
before update or delete on public.hero_build_set_revisions
for each row execute function public.prevent_hero_build_set_revision_changes();

alter table public.hero_build_set_revisions enable row level security;

drop policy if exists "Admins can read hero build set revisions"
  on public.hero_build_set_revisions;
create policy "Admins can read hero build set revisions"
  on public.hero_build_set_revisions
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

revoke all on public.hero_build_set_revisions from public, anon, authenticated;
grant select on public.hero_build_set_revisions to authenticated;

drop function if exists public.create_or_update_draft_hero_build_set(text, jsonb);
drop function if exists public.publish_hero_build_set(text, jsonb);
drop function if exists public.update_published_hero_build_set(text, jsonb);
drop function if exists public.restore_published_hero_build_set(bigint, bigint);

create or replace function public.create_or_update_draft_hero_build_set(
  p_hero_id text,
  p_payload jsonb,
  p_expected_revision bigint
)
returns public.hero_build_sets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  previous_row public.hero_build_sets%rowtype;
  resulting_row public.hero_build_sets%rowtype;
  history_event text;
begin
  if v_actor is null then
    raise exception 'Authenticated actor required.' using errcode = '42501';
  end if;

  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  if p_expected_revision is null then
    begin
      insert into public.hero_build_sets (
        hero_id,
        status,
        payload,
        revision,
        updated_by
      )
      values (p_hero_id, 'draft', p_payload, 1, v_actor)
      returning * into resulting_row;
    exception
      when unique_violation then
        raise exception 'Hero build set revision conflict for hero %.', p_hero_id
          using errcode = 'P4090';
    end;

    history_event := 'created_draft';
  else
    select *
    into previous_row
    from public.hero_build_sets
    where hero_id = p_hero_id
      and status = 'draft'
      and revision = p_expected_revision
    for update;

    if not found then
      raise exception 'Hero build set revision conflict for hero %.', p_hero_id
        using errcode = 'P4090';
    end if;

    update public.hero_build_sets
    set payload = p_payload,
        revision = revision + 1,
        updated_by = v_actor
    where hero_id = p_hero_id
      and status = 'draft'
      and revision = p_expected_revision
    returning * into resulting_row;

    if not found then
      raise exception 'Hero build set revision conflict for hero %.', p_hero_id
        using errcode = 'P4090';
    end if;

    history_event := 'updated_draft';
  end if;

  insert into public.hero_build_set_revisions (
    hero_id,
    revision,
    event_type,
    previous_revision,
    previous_status,
    previous_payload,
    status,
    payload,
    updated_by
  ) values (
    resulting_row.hero_id,
    resulting_row.revision,
    history_event,
    previous_row.revision,
    previous_row.status,
    previous_row.payload,
    resulting_row.status,
    resulting_row.payload,
    v_actor
  );

  return resulting_row;
end;
$$;

create or replace function public.publish_hero_build_set(
  p_hero_id text,
  p_payload jsonb,
  p_expected_revision bigint
)
returns public.hero_build_sets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  previous_row public.hero_build_sets%rowtype;
  resulting_row public.hero_build_sets%rowtype;
begin
  if v_actor is null then
    raise exception 'Authenticated actor required.' using errcode = '42501';
  end if;

  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  select *
  into previous_row
  from public.hero_build_sets
  where hero_id = p_hero_id
    and status = 'draft'
    and revision = p_expected_revision
  for update;

  if not found then
    raise exception 'Hero build set revision conflict for hero %.', p_hero_id
      using errcode = 'P4090';
  end if;

  update public.hero_build_sets
  set status = 'published',
      payload = p_payload,
      revision = revision + 1,
      updated_by = v_actor
  where hero_id = p_hero_id
    and status = 'draft'
    and revision = p_expected_revision
  returning * into resulting_row;

  if not found then
    raise exception 'Hero build set revision conflict for hero %.', p_hero_id
      using errcode = 'P4090';
  end if;

  insert into public.hero_build_set_revisions (
    hero_id,
    revision,
    event_type,
    previous_revision,
    previous_status,
    previous_payload,
    status,
    payload,
    updated_by
  ) values (
    resulting_row.hero_id,
    resulting_row.revision,
    'published',
    previous_row.revision,
    previous_row.status,
    previous_row.payload,
    resulting_row.status,
    resulting_row.payload,
    v_actor
  );

  return resulting_row;
end;
$$;

create or replace function public.update_published_hero_build_set(
  p_hero_id text,
  p_payload jsonb,
  p_expected_revision bigint
)
returns public.hero_build_sets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  previous_row public.hero_build_sets%rowtype;
  resulting_row public.hero_build_sets%rowtype;
begin
  if v_actor is null then
    raise exception 'Authenticated actor required.' using errcode = '42501';
  end if;

  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  select *
  into previous_row
  from public.hero_build_sets
  where hero_id = p_hero_id
    and status = 'published'
    and revision = p_expected_revision
  for update;

  if not found then
    raise exception 'Hero build set revision conflict for hero %.', p_hero_id
      using errcode = 'P4090';
  end if;

  update public.hero_build_sets
  set payload = p_payload,
      revision = revision + 1,
      updated_by = v_actor
  where hero_id = p_hero_id
    and status = 'published'
    and revision = p_expected_revision
  returning * into resulting_row;

  if not found then
    raise exception 'Hero build set revision conflict for hero %.', p_hero_id
      using errcode = 'P4090';
  end if;

  insert into public.hero_build_set_revisions (
    hero_id,
    revision,
    event_type,
    previous_revision,
    previous_status,
    previous_payload,
    status,
    payload,
    updated_by
  ) values (
    resulting_row.hero_id,
    resulting_row.revision,
    'updated_published',
    previous_row.revision,
    previous_row.status,
    previous_row.payload,
    resulting_row.status,
    resulting_row.payload,
    v_actor
  );

  return resulting_row;
end;
$$;

create or replace function public.restore_published_hero_build_set(
  p_hero_id text,
  p_history_id bigint,
  p_expected_revision bigint
)
returns public.hero_build_sets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  source_revision public.hero_build_set_revisions%rowtype;
  previous_row public.hero_build_sets%rowtype;
  resulting_row public.hero_build_sets%rowtype;
begin
  if v_actor is null then
    raise exception 'Authenticated actor required.' using errcode = '42501';
  end if;

  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  select *
  into source_revision
  from public.hero_build_set_revisions
  where id = p_history_id
    and hero_id = p_hero_id
    and status = 'published';

  if not found then
    raise exception 'Published hero build set revision not found.'
      using errcode = '22023';
  end if;

  select *
  into previous_row
  from public.hero_build_sets
  where hero_id = p_hero_id
    and status = 'published'
    and revision = p_expected_revision
  for update;

  if not found then
    raise exception 'Hero build set revision conflict for hero %.', p_hero_id
      using errcode = 'P4090';
  end if;

  update public.hero_build_sets
  set payload = source_revision.payload,
      revision = revision + 1,
      updated_by = v_actor
  where hero_id = p_hero_id
    and status = 'published'
    and revision = p_expected_revision
  returning * into resulting_row;

  if not found then
    raise exception 'Hero build set revision conflict for hero %.', p_hero_id
      using errcode = 'P4090';
  end if;

  insert into public.hero_build_set_revisions (
    hero_id,
    revision,
    event_type,
    previous_revision,
    previous_status,
    previous_payload,
    status,
    payload,
    updated_by
  ) values (
    resulting_row.hero_id,
    resulting_row.revision,
    'restored_published',
    previous_row.revision,
    previous_row.status,
    previous_row.payload,
    resulting_row.status,
    resulting_row.payload,
    v_actor
  );

  return resulting_row;
end;
$$;

revoke all on function public.create_or_update_draft_hero_build_set(text, jsonb, bigint)
  from public, anon, authenticated;
revoke all on function public.publish_hero_build_set(text, jsonb, bigint)
  from public, anon, authenticated;
revoke all on function public.update_published_hero_build_set(text, jsonb, bigint)
  from public, anon, authenticated;
revoke all on function public.restore_published_hero_build_set(text, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.create_or_update_draft_hero_build_set(text, jsonb, bigint)
  to authenticated;
grant execute on function public.publish_hero_build_set(text, jsonb, bigint)
  to authenticated;
grant execute on function public.update_published_hero_build_set(text, jsonb, bigint)
  to authenticated;
grant execute on function public.restore_published_hero_build_set(text, bigint, bigint)
  to authenticated;

commit;
