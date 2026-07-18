begin;

do $$
begin
  if exists (
    select 1
    from public.hero_build_sets as old_row
    join public.hero_build_sets as new_row
      on new_row.status = old_row.status
    where old_row.hero_id = 'nephyths'
      and new_row.hero_id = 'nephthys'
  ) then
    raise exception 'Cannot migrate nephyths: nephthys already exists for the same status'
      using errcode = 'unique_violation';
  end if;
end;
$$;

create or replace function pg_temp.migrate_hero_localization(input_value jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  migrated_value jsonb;
begin
  case jsonb_typeof(input_value)
    when 'object' then
      select coalesce(
        jsonb_object_agg(
          object_entry.key,
          pg_temp.migrate_hero_localization(object_entry.value)
        ),
        '{}'::jsonb
      )
      into migrated_value
      from jsonb_each(input_value) as object_entry;

      return migrated_value;
    when 'array' then
      select coalesce(
        jsonb_agg(
          pg_temp.migrate_hero_localization(array_entry.value)
          order by array_entry.ordinality
        ),
        '[]'::jsonb
      )
      into migrated_value
      from jsonb_array_elements(input_value) with ordinality
        as array_entry(value, ordinality);

      return migrated_value;
    when 'string' then
      return to_jsonb(
        case input_value #>> '{}'
          when 'nephyths' then 'nephthys'
          when 'Камазотль' then 'Камасоц'
          when 'Цирцея' then 'Кирка'
          when 'Дацзи' then 'Даджи'
          when 'Дуллахан' then 'Дюллахан'
          when 'Гавриил' then 'Габриэлла'
          when 'Ганьцзян и Мо Е' then 'Ганьцзян и Мое'
          when 'Хаттори Ханзо' then 'Хаттори Хандзо'
          when 'Хела' then 'Хель'
          when 'Исет' then 'Исида'
          when 'Ло Шэнь' then 'Луошэнь'
          when 'Нува' then 'Нюйва'
          when 'Тамамо-но-Маэ' then 'Тамамо-но маэ'
          when 'Западная царица' then 'Королева запада'
          when 'И Сун-син' then 'Ли Сунсин'
          when 'Nephyths' then 'Nephthys'
          when 'Sun WuKong' then 'Sun Wukong'
          when 'Yi Sun-Shin' then 'Yi Sun-shin'
          else input_value #>> '{}'
        end
      );
    else
      return input_value;
  end case;
end;
$$;

with migrated_payloads as (
  select
    hero_id,
    status,
    pg_temp.migrate_hero_localization(payload) as payload
  from public.hero_build_sets
)
update public.hero_build_sets as build_set
set payload = migrated_payloads.payload
from migrated_payloads
where build_set.hero_id = migrated_payloads.hero_id
  and build_set.status = migrated_payloads.status
  and build_set.payload is distinct from migrated_payloads.payload;

update public.hero_build_sets
set hero_id = 'nephthys'
where hero_id = 'nephyths';

commit;
