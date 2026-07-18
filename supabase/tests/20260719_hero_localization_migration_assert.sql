do $$
declare
  expected_names jsonb := jsonb_build_array(
    'Камасоц',
    'Кирка',
    'Даджи',
    'Дюллахан',
    'Габриэлла',
    'Ганьцзян и Мое',
    'Хаттори Хандзо',
    'Хель',
    'Исида',
    'Луошэнь',
    'Нюйва',
    'Тамамо-но маэ',
    'Королева запада',
    'Ли Сунсин',
    'Nephthys',
    'Sun Wukong',
    'Yi Sun-shin'
  );
  expected_bastet_names jsonb := jsonb_build_array(
    'Камасоц',
    'Nephthys',
    'Sun Wukong'
  );
  migrated_payload jsonb;
  bastet_payload jsonb;
begin
  if exists (
    select 1
    from public.hero_build_sets
    where hero_id = 'nephyths'
  ) then
    raise exception 'obsolete nephyths hero id remains';
  end if;

  select payload
  into migrated_payload
  from public.hero_build_sets
  where hero_id = 'nephthys'
    and status = 'draft';

  if migrated_payload is null then
    raise exception 'migrated nephthys row is missing';
  end if;

  if (
    select count(*)
    from public.hero_build_sets
    where hero_id = 'nephthys'
      and status in ('draft', 'published')
  ) is distinct from 2 then
    raise exception 'both nephthys statuses were not migrated';
  end if;

  if exists (
    select 1
    from public.hero_build_sets
    where hero_id = 'nephthys'
      and status in ('draft', 'published')
      and (
        payload ->> 'heroId' is distinct from 'nephthys'
        or payload -> 'names' is distinct from expected_names
        or payload #>> '{metadata,legacyHeroId}' is distinct from 'nephthys'
        or payload #>> '{metadata,legacyLocalizedName}' is distinct from 'Камасоц'
      )
  ) then
    raise exception 'nephthys localized leaves were not migrated';
  end if;

  if migrated_payload ->> 'description' is distinct from 'Камазотль внутри описания'
    or migrated_payload #>> '{metadata,note}' is distinct from 'nephyths внутри служебной заметки' then
    raise exception 'substring inside draft descriptive text was changed';
  end if;

  if exists (
    select 1
    from public.hero_build_sets
    where hero_id = 'nephthys'
      and status = 'published'
      and (
        payload ->> 'description' is distinct from 'Камазотль внутри опубликованного описания'
        or payload #>> '{metadata,note}' is distinct from 'nephyths внутри опубликованной заметки'
      )
  ) then
    raise exception 'substring inside published descriptive text was changed';
  end if;

  select payload
  into bastet_payload
  from public.hero_build_sets
  where hero_id = 'bastet'
    and status = 'published';

  if bastet_payload is null then
    raise exception 'unrelated bastet row is missing';
  end if;

  if bastet_payload ->> 'heroId' is distinct from 'bastet'
    or bastet_payload -> 'names' is distinct from expected_bastet_names
    or bastet_payload #>> '{metadata,legacyHeroId}' is distinct from 'nephthys'
    or bastet_payload #>> '{metadata,legacyLocalizedName}' is distinct from 'Камасоц' then
    raise exception 'unrelated bastet localized leaves were not migrated';
  end if;

  if bastet_payload ->> 'description' is distinct from 'Камазотль внутри описания Бастет'
    or bastet_payload #>> '{metadata,note}' is distinct from 'nephyths внутри заметки Бастет' then
    raise exception 'substring inside bastet descriptive text was changed';
  end if;
end;
$$;
