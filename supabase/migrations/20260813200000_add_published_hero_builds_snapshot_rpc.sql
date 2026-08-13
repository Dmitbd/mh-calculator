create or replace function public.get_published_hero_builds_snapshot()
returns table (
  published_count bigint,
  version text,
  etag text,
  content_updated_at text,
  resource_checksum text,
  hero_builds_text text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  row_count bigint;
  metadata jsonb;
  hero_builds_json jsonb;
  content_hash text;
  resource_text text;
begin
  select count(*) into row_count
  from public.hero_build_sets
  where status = 'published';

  if row_count > 1000 then
    raise exception 'published hero build snapshot exceeds resource budget';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_array(hero_id, revision,
      to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by hero_id), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('hero_id', hero_id, 'payload', payload) order by hero_id), '[]'::jsonb)
  into metadata, hero_builds_json
  from public.hero_build_sets
  where status = 'published';

  content_hash := encode(extensions.digest(metadata::text, 'sha256'), 'hex');
  resource_text := hero_builds_json::text;
  if octet_length(resource_text) > 1572864 then
    raise exception 'published hero build snapshot exceeds byte budget';
  end if;
  published_count := row_count;
  version := 'hero-builds:' || left(content_hash, 16);
  etag := 'sha256:' || content_hash;
  resource_checksum := 'sha256:' || encode(
    extensions.digest(convert_to(resource_text, 'UTF8'), 'sha256'),
    'hex'
  );
  hero_builds_text := resource_text;
  select coalesce(to_char(max(updated_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    '1970-01-01T00:00:00.000000Z') into content_updated_at
  from public.hero_build_sets where status = 'published';
  return next;
end;
$$;

revoke all on function public.get_published_hero_builds_snapshot() from public;
grant execute on function public.get_published_hero_builds_snapshot() to anon, authenticated;
