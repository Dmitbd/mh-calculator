create extension if not exists pgcrypto with schema extensions;

create or replace function public.get_published_hero_builds_bootstrap_manifest()
returns table (
  published_count bigint,
  version text,
  etag text,
  content_updated_at text
)
language sql
stable
security invoker
set search_path = ''
as $$
with manifest_input as (
  select
    count(*)::bigint as published_count,
    coalesce(
      to_char(max(updated_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      '1970-01-01T00:00:00.000000Z'
    ) as content_updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_array(
          hero_id,
          revision,
          to_char(
            updated_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
          )
        )
        order by hero_id
      ),
      '[]'::jsonb
    )::text as canonical_metadata
  from public.hero_build_sets
  where status = 'published'
), manifest_digest as (
  select
    published_count,
    content_updated_at,
    encode(
      extensions.digest(canonical_metadata, 'sha256'),
      'hex'
    ) as content_hash
  from manifest_input
)
select
  published_count,
  'hero-builds:' || left(content_hash, 16) as version,
  'sha256:' || content_hash as etag,
  content_updated_at
from manifest_digest;
$$;

revoke all on function public.get_published_hero_builds_bootstrap_manifest()
  from public;
grant execute on function public.get_published_hero_builds_bootstrap_manifest()
  to anon, authenticated;
