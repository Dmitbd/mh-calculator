# Hero Localization and ID Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every affected hero name with the current Mythic Heroes localization and strictly migrate the canonical id `nephyths` to `nephthys` in the repository and Supabase.

**Architecture:** Keep `heroes.json` as the frontend source of truth, rename the one id-coupled asset, and use a new transactional Supabase migration for persisted rows and nested JSON payloads. Do not add aliases or normalization; frontend and backend switch to the corrected values together.

**Tech Stack:** TypeScript 6, Expo 56, Jest 29, JSON game data, PostgreSQL 17, Supabase migrations, Docker for migration integration testing.

## Global Constraints

- The current Russian and English Mythic Heroes localization is the naming source of truth.
- The migration is strict: no aliases, redirects, fallback ids, or import normalization for `nephyths`.
- `src/features/game-data/heroes/heroes.json` remains the runtime hero catalog.
- Only `nephyths` changes as a canonical id; `sun-wukong` and `yi-sun-shin` remain unchanged.
- The Supabase migration must update both `draft` and `published` rows in one transaction.
- A conflicting `(nephthys, status)` row must abort the migration without silently overwriting data.
- JSON migration replaces exact string leaf values, never substrings inside descriptive text.
- Do not change hero roles, factions, elements, rarity, release dates, or builds.
- Do not refactor unrelated catalog, routing, repository, or admin code.

---

### Task 1: Correct the local hero catalog and canonical asset id

**Files:**
- Modify: `src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts`
- Modify: `src/features/game-data/heroes/heroes.json`
- Rename: `public/img/heroes/nephyths.png` to `public/img/heroes/nephthys.png`
- Modify: `src/features/admin/__tests__/HeroGuideSelector.test.tsx`
- Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`
- Modify: `src/features/admin/__tests__/validateBranchBuild.test.ts`
- Modify: `src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`

**Interfaces:**
- Consumes: the existing `heroes: Hero[]` catalog exported by `src/features/game-data/heroes/heroBuilds.ts`.
- Produces: corrected catalog records, the canonical `nephthys` id, and `/img/heroes/nephthys.png` for route, export, and backend consumers.

- [ ] **Step 1: Add a failing exact-localization catalog test**

Add this constant above `describe("master hero catalog", ...)` in `src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts`:

```ts
const correctedHeroNames = {
  camazotz: { en: "Camazotz", ru: "Камасоц" },
  circe: { en: "Circe", ru: "Кирка" },
  daji: { en: "Daji", ru: "Даджи" },
  dullahan: { en: "Dullahan", ru: "Дюллахан" },
  gabriel: { en: "Gabriel", ru: "Габриэлла" },
  "ganjiang-moye": { en: "Ganjiang & Moye", ru: "Ганьцзян и Мое" },
  "hattori-hanzo": { en: "Hattori Hanzo", ru: "Хаттори Хандзо" },
  hela: { en: "Hela", ru: "Хель" },
  iset: { en: "Iset", ru: "Исида" },
  luoshen: { en: "Luoshen", ru: "Луошэнь" },
  nephthys: { en: "Nephthys", ru: "Нефтида" },
  nuwa: { en: "Nuwa", ru: "Нюйва" },
  "sun-wukong": { en: "Sun Wukong", ru: "Сунь Укун" },
  "tamamo-no-mae": { en: "Tamamo no Mae", ru: "Тамамо-но маэ" },
  "western-queen": { en: "Western Queen", ru: "Королева запада" },
  "yi-sun-shin": { en: "Yi Sun-shin", ru: "Ли Сунсин" },
} as const;
```

Add these tests inside `describe("master hero catalog", ...)`:

```ts
test.each(Object.entries(correctedHeroNames))(
  "%s uses the current game localization",
  (heroId, expectedName) => {
    expect(heroes.find((hero) => hero.id === heroId)?.name).toEqual(expectedName);
  },
);

test("the obsolete Nephyths id and icon path are absent", () => {
  expect(heroes.some((hero) => hero.id === "nephyths")).toBe(false);
  expect(heroes.some((hero) => hero.icon.includes("nephyths"))).toBe(false);
  expect(heroes.find((hero) => hero.id === "nephthys")?.icon).toBe(
    "/img/heroes/nephthys.png",
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts --runInBand
```

Expected: FAIL. The 16 parameterized cases expose the old display names or missing `nephthys` record, and the obsolete-id test finds `nephyths`.

- [ ] **Step 3: Apply the exact catalog replacements**

Update only the affected records in `src/features/game-data/heroes/heroes.json`:

```text
Камазотль -> Камасоц
Цирцея -> Кирка
Дацзи -> Даджи
Дуллахан -> Дюллахан
Гавриил -> Габриэлла
Ганьцзян и Мо Е -> Ганьцзян и Мое
Хаттори Ханзо -> Хаттори Хандзо
Хела -> Хель
Исет -> Исида
Ло Шэнь -> Луошэнь
Нува -> Нюйва
Тамамо-но-Маэ -> Тамамо-но маэ
Западная царица -> Королева запада
И Сун-син -> Ли Сунсин
Nephyths -> Nephthys
Sun WuKong -> Sun Wukong
Yi Sun-Shin -> Yi Sun-shin
```

For the Nephthys record, also apply:

```json
{
  "id": "nephthys",
  "name": {
    "en": "Nephthys",
    "ru": "Нефтида"
  },
  "icon": "/img/heroes/nephthys.png"
}
```

Preserve every other field in that record unchanged.

- [ ] **Step 4: Rename the id-coupled hero asset**

Run:

```bash
mv public/img/heroes/nephyths.png public/img/heroes/nephthys.png
```

Expected: `public/img/heroes/nephthys.png` exists and `public/img/heroes/nephyths.png` does not.

- [ ] **Step 5: Run the catalog test and verify GREEN**

Run:

```bash
npm test -- src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts --runInBand
```

Expected: PASS, including all exact-localization and catalog-integrity cases.

- [ ] **Step 6: Run dependent admin tests and observe stale expectations**

Run:

```bash
npm test -- src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/validateBranchBuild.test.ts src/features/admin/__tests__/useDivinityBranchBuilder.test.ts --runInBand
```

Expected: FAIL only where the tests still look for `Ганьцзян и Мо Е` or `Западная царица`.

- [ ] **Step 7: Update dependent assertions and fixtures**

Apply these exact test-only replacements:

```text
src/features/admin/__tests__/HeroGuideSelector.test.tsx
  Ганьцзян и Мо Е -> Ганьцзян и Мое
  "Ганьцзян и\nМо Е" -> "Ганьцзян\nи Мое"

src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
  Выбрать героя Западная царица -> Выбрать героя Королева запада

src/features/admin/__tests__/validateBranchBuild.test.ts
  heroName: "Западная царица" -> heroName: "Королева запада"

src/features/admin/__tests__/useDivinityBranchBuilder.test.ts
  heroName: "Западная царица" -> heroName: "Королева запада"
```

Do not change the intentional `heroName: "Western Queen"` mismatch case in `validateBranchBuild.test.ts`.

- [ ] **Step 8: Re-run the affected tests**

Run:

```bash
npm test -- src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/validateBranchBuild.test.ts src/features/admin/__tests__/useDivinityBranchBuilder.test.ts --runInBand
```

Expected: PASS with zero failed suites and zero failed tests.

- [ ] **Step 9: Verify local production data has no obsolete values**

Run:

```bash
rg -n 'Nephyths|Sun WuKong|Yi Sun-Shin|Камазотль|Цирцея|Дацзи|Дуллахан|Гавриил|Ганьцзян и Мо Е|Хаттори Ханзо|Хела|Исет|Ло Шэнь|Нува|Тамамо-но-Маэ|Западная царица|И Сун-син' app src --glob '!**/__tests__/**'
```

Expected: no output.

- [ ] **Step 10: Commit the catalog migration**

```bash
git add src/features/game-data/heroes/heroes.json src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts src/features/admin/__tests__/HeroGuideSelector.test.tsx src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/validateBranchBuild.test.ts src/features/admin/__tests__/useDivinityBranchBuilder.test.ts public/img/heroes/nephyths.png public/img/heroes/nephthys.png
git commit -m "fix: align hero names with game localization"
```

Expected: one commit containing the catalog, tests, and detected asset rename.

---

### Task 2: Migrate persisted Supabase hero ids and localized payload values

**Files:**
- Create: `supabase/tests/20260719_hero_localization_migration_setup.sql`
- Create: `supabase/tests/20260719_hero_localization_migration_assert.sql`
- Create: `supabase/migrations/20260719120000_migrate_hero_localization.sql`

**Interfaces:**
- Consumes: `public.hero_build_sets(hero_id text, status text, payload jsonb)` created by migration `20260702170000_create_hero_build_sets.sql`.
- Produces: canonical `hero_id = 'nephthys'` rows and recursively corrected exact string leaves in every build payload.

- [ ] **Step 1: Write the disposable database setup fixture**

Create `supabase/tests/20260719_hero_localization_migration_setup.sql`:

```sql
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
```

- [ ] **Step 2: Write the database assertion script**

Create `supabase/tests/20260719_hero_localization_migration_assert.sql`:

```sql
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
```

- [ ] **Step 3: Start an isolated PostgreSQL 17 test database**

Run:

```bash
docker run --name mh-calculator-hero-migration-test -e POSTGRES_PASSWORD=postgres -d postgres:17
docker exec mh-calculator-hero-migration-test pg_isready -U postgres
```

Expected: the first command starts one explicitly named disposable container; the readiness command reports `accepting connections`. If the image is not present, approve the scoped Docker pull when prompted.

- [ ] **Step 4: Copy and load the RED fixtures**

Run:

```bash
docker cp supabase/tests/20260719_hero_localization_migration_setup.sql mh-calculator-hero-migration-test:/tmp/setup.sql
docker cp supabase/tests/20260719_hero_localization_migration_assert.sql mh-calculator-hero-migration-test:/tmp/assert.sql
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/setup.sql
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/assert.sql
```

Expected: setup succeeds; assertion fails with `obsolete nephyths hero id remains`. This proves the integration check detects the pre-migration state.

- [ ] **Step 5: Implement the transactional Supabase migration**

Create `supabase/migrations/20260719120000_migrate_hero_localization.sql`:

```sql
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
```

- [ ] **Step 6: Run the migration test and verify GREEN**

Run:

```bash
docker cp supabase/migrations/20260719120000_migrate_hero_localization.sql mh-calculator-hero-migration-test:/tmp/migration.sql
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/setup.sql
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/migration.sql
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/assert.sql
```

Expected: setup resets the schema; migration and assertion both exit successfully.

- [ ] **Step 7: Verify collision handling aborts before data changes**

Reset the fixture and insert a conflicting canonical row:

```bash
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/setup.sql
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -c "insert into public.hero_build_sets (hero_id, status, payload) values ('nephthys', 'draft', '{}'::jsonb);"
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -f /tmp/migration.sql
```

Expected: the migration command fails with `Cannot migrate nephyths: nephthys already exists for the same status`.

Confirm both source rows still exist because the transaction rolled back:

```bash
docker exec mh-calculator-hero-migration-test psql -v ON_ERROR_STOP=1 -U postgres -c "select hero_id, status from public.hero_build_sets order by hero_id;"
```

Expected rows: `nephthys | draft` and `nephyths | draft`.

- [ ] **Step 8: Remove the disposable database container**

Run:

```bash
docker rm -f mh-calculator-hero-migration-test
```

Expected: only the explicitly named disposable test container is removed.

- [ ] **Step 9: Commit the backend migration and integration fixtures**

```bash
git add supabase/migrations/20260719120000_migrate_hero_localization.sql supabase/tests/20260719_hero_localization_migration_setup.sql supabase/tests/20260719_hero_localization_migration_assert.sql
git commit -m "fix: migrate hero localization in supabase"
```

Expected: one commit containing the migration and its reproducible PostgreSQL fixtures.

---

### Task 3: Verify the complete migration and apply it to the linked backend

**Files:**
- Verify: all files changed in Tasks 1 and 2
- Verify remote: Supabase project `qgujrvktuniiofyfxeaw`, derived from `.env.example`

**Interfaces:**
- Consumes: corrected local catalog and migration `20260719120000_migrate_hero_localization.sql`.
- Produces: a verified web build and a remote Supabase migration record, or a precise credential/linkage blocker without a false deployment claim.

- [ ] **Step 1: Run the complete Jest suite**

Run:

```bash
npm test -- --runInBand
```

Expected: all suites and tests pass with zero failures.

- [ ] **Step 2: Run TypeScript validation**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Export the static web application**

Run:

```bash
npm run export:web
```

Expected: Expo export completes successfully and writes `dist/`.

Verify the canonical route is generated and the obsolete route is absent:

```bash
find dist -type f | rg '/heroes/nephthys(\.html|/index\.html)$'
find dist -type f | rg '/heroes/nephyths(\.html|/index\.html)$'
```

Expected: the first command prints one generated Nephthys route; the second prints nothing.

- [ ] **Step 4: Run final obsolete-value and asset checks**

Run:

```bash
rg -n 'Nephyths|Sun WuKong|Yi Sun-Shin|Камазотль|Цирцея|Дацзи|Дуллахан|Гавриил|Ганьцзян и Мо Е|Хаттори Ханзо|Хела|Исет|Ло Шэнь|Нува|Тамамо-но-Маэ|Западная царица|И Сун-син' app src --glob '!**/__tests__/**'
test -f public/img/heroes/nephthys.png
test ! -e public/img/heroes/nephyths.png
```

Expected: ripgrep has no output and both file assertions exit successfully. Old values remain only where intentionally documented or used as migration input in `docs/superpowers`, `supabase/migrations`, and `supabase/tests`.

- [ ] **Step 5: Inspect Supabase linkage before changing the remote database**

Run:

```bash
npx supabase@latest projects list
```

Expected: authenticated output includes project ref `qgujrvktuniiofyfxeaw`. If authentication is missing, report the CLI login requirement and do not claim remote completion.

If the repository is not already linked, run:

```bash
npx supabase@latest link --project-ref qgujrvktuniiofyfxeaw
```

Expected: the repository links to the intended Supabase project. Supply the database password only through the CLI prompt or an approved secret mechanism; never print or commit it.

- [ ] **Step 6: Preview the remote migration**

Run:

```bash
npx supabase@latest db push --dry-run
```

Expected: the preview lists `20260719120000_migrate_hero_localization.sql` and no unrelated pending migration.

- [ ] **Step 7: Apply and verify the remote migration**

Run:

```bash
npx supabase@latest db push
npx supabase@latest migration list --linked
```

Expected: `db push` reports successful application and the linked migration list shows `20260719120000` on both local and remote sides.

- [ ] **Step 8: Verify repository state and report evidence**

Run:

```bash
git status --short --branch
git log -5 --oneline --decorate
```

Expected: no uncommitted implementation changes remain, the implementation commits are visible, and the branch is ahead of `origin/main` until the user separately requests a push.

Report exact Jest counts, TypeScript/export exit status, PostgreSQL integration-test results, and the remote Supabase migration result. If remote access was unavailable, distinguish completed repository migration work from the unapplied remote migration.
