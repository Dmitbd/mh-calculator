drop schema if exists public cascade;
create schema public;

create table public.hero_build_sets (
  hero_id text not null,
  status text not null check (status in ('draft', 'published')),
  payload jsonb not null,
  primary key (hero_id, status)
);

insert into public.hero_build_sets (hero_id, status, payload)
values (
  'nephyths',
  'draft',
  jsonb_build_object(
    'heroId', 'nephyths',
    'heroName', 'Нефтида',
    'names', jsonb_build_array(
      'Камазотль',
      'Цирцея',
      'Дацзи',
      'Дуллахан',
      'Гавриил',
      'Ганьцзян и Мо Е',
      'Хаттори Ханзо',
      'Хела',
      'Исет',
      'Ло Шэнь',
      'Нува',
      'Тамамо-но-Маэ',
      'Западная царица',
      'И Сун-син',
      'Nephyths',
      'Sun WuKong',
      'Yi Sun-Shin'
    ),
    'description', 'Камазотль внутри описания'
  )
);
