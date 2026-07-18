do $$
declare
  migrated_payload jsonb;
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

  if migrated_payload ->> 'heroId' <> 'nephthys' then
    raise exception 'nested heroId was not migrated';
  end if;

  if migrated_payload -> 'names' <> jsonb_build_array(
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
  ) then
    raise exception 'localized name leaves were not migrated';
  end if;

  if migrated_payload ->> 'description' <> 'Камазотль внутри описания' then
    raise exception 'substring inside descriptive text was changed';
  end if;
end;
$$;
