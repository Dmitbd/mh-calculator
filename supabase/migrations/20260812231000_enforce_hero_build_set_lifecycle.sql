begin;

delete from public.hero_build_sets as draft
using public.hero_build_sets as published
where draft.hero_id = published.hero_id
  and draft.status = 'draft'
  and published.status = 'published';

alter table public.hero_build_sets
  drop constraint if exists hero_build_sets_pkey;

alter table public.hero_build_sets
  add constraint hero_build_sets_pkey primary key (hero_id);

create or replace function public.prevent_published_hero_build_set_regression()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Hero build sets must start as drafts.';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status = 'published' then
      raise exception 'Published hero build sets cannot be deleted.';
    end if;

    return old;
  end if;

  if new.hero_id <> old.hero_id then
    raise exception 'Hero build set identity cannot be changed.';
  end if;

  if old.status = 'published' and new.status <> 'published' then
    raise exception 'Published hero build sets cannot return to draft.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_published_hero_build_set_regression
  on public.hero_build_sets;
create trigger prevent_published_hero_build_set_regression
before insert or update or delete on public.hero_build_sets
for each row execute function public.prevent_published_hero_build_set_regression();

create or replace function public.publish_hero_build_set(
  p_hero_id text,
  p_payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.hero_build_sets
  set status = 'published',
      payload = p_payload,
      updated_by = auth.uid()
  where hero_id = p_hero_id
    and status = 'draft';

  if not found then
    raise exception 'Draft hero build set not found for hero %.', p_hero_id;
  end if;
end;
$$;

revoke all on function public.publish_hero_build_set(text, jsonb) from public;
revoke all on function public.publish_hero_build_set(text, jsonb) from anon;
grant execute on function public.publish_hero_build_set(text, jsonb) to authenticated;

commit;
