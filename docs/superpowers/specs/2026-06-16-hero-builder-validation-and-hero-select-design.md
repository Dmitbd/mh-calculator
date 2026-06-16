# Hero Builder Validation And Hero Select Specification

Date: 2026-06-16

## Goal

Tighten the hero build builder form so exported builds are valid, reusable, and tied to the hero catalog.

Main requirements:

- a build cannot be exported with empty rune variants;
- a build cannot be exported with empty weapon variants;
- the hero is selected from the local hero database, not typed as free text;
- the saved build uses `heroId` as the source of truth;
- the Russian hero name is inserted from the catalog after selection and is not manually translated during save.

This task applies to the builder form first. The resulting data must also be ready for later insertion into `src/features/game-data/heroes/builds/{heroId}.json`.

## Current Project Context

Relevant files:

- `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- `src/features/admin/components/HeroNameInput.tsx`
- `src/features/admin/components/EquipmentVariantBuilder.tsx`
- `src/features/admin/utils/validateBranchBuild.ts`
- `src/features/admin/types/admin.types.ts`
- `src/features/game-data/heroes/heroes.json`
- `src/features/game-data/heroes/heroBuilds.ts`
- `src/features/game-data/equipment/artifacts.json`
- `src/features/game-data/equipment/runes.json`

Current state:

- hero field is a plain text input;
- `heroName` is saved from user input;
- hero catalog already exists locally in `heroes.json`;
- `getHeroById(heroId)` already exists in `heroBuilds.ts`;
- equipment already uses arrays:
  - `equipment.artifactIds: string[]`;
  - `equipment.runeIds: string[]`;
- `validateBranchBuild` already validates empty rune and weapon arrays.

Problem:

- the builder still allows a typo in hero name;
- the exported build is not guaranteed to be connected to a catalog hero id;
- later build insertion requires a reliable `heroId`, not a Russian-name-to-id conversion.

## Data Model

Add `heroId` to builder draft and export models.

Recommended builder draft shape:

```ts
export type DivinityBranchBuildDraft = {
  gameMode: DivinityGameMode;
  heroId: string;
  heroName: string;
  columns: SelectedBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
  equipment: EquipmentVariantSelection;
};
```

Validation draft can keep nullable hero selection:

```ts
export type DivinityBranchBuildValidationDraft = {
  gameMode: DivinityGameMode;
  heroId: string | null;
  heroName: string;
  columns: DraftBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
  equipment: EquipmentVariantSelection;
};
```

Exported builder JSON:

```json
{
  "schemaVersion": 1,
  "gameMode": "pvp",
  "heroId": "bastet",
  "heroName": "Бастет",
  "targetTabPath": ["pvp"],
  "equipment": {
    "artifactIds": ["axe-of-pangu"],
    "runeIds": ["air"]
  }
}
```

Rules:

- `heroId` is the canonical hero identifier.
- `heroName` is copied from `hero.name.ru` after selecting the hero.
- User input must never be used as final `heroName` unless it came from a selected catalog hero.
- Export file name should use `heroId`, not `slugifyFileName(heroName)`.
- Existing committed build data may keep `heroName` for display/backward readability, but future insertion should be keyed by `heroId`.

## Hero Select Requirements

Replace `HeroNameInput` with a catalog-backed selector, for example `HeroSelectInput`.

### Behavior

The input works as searchable autocomplete:

- user types part of a hero name;
- component searches local `heroes` catalog;
- dropdown shows matching heroes;
- user selects one hero from the dropdown;
- input value becomes the Russian hero name;
- builder state receives the selected `heroId`;
- form is valid only while the selected hero is still intact.

Typing arbitrary text is allowed only as a search action. It is not a valid final value.

If user changes the text after selecting a hero:

- clear `selectedHeroId`;
- keep typed text as search query;
- show matching options again;
- validation must fail until user selects a hero from the dropdown.

### Search Matching

Search should be local and deterministic.

Match by:

- Russian name: `hero.name.ru`;
- English name: `hero.name.en`;
- hero id: `hero.id`.

Matching should be:

- case-insensitive;
- trimmed;
- tolerant to partial input.

Examples:

- `бас` finds `Бастет`;
- `bast` finds `Bastet`;
- `bastet` finds hero id `bastet`.

### Dropdown Item

Each dropdown row should show enough context to avoid wrong selection:

- hero icon;
- Russian name;
- English name as secondary text;
- rarity badge or text (`UR` / `SSR`);
- optional role/faction/element icons if already available in shared catalog UI.

The dropdown should be compact and should not look like a large card list.

### Empty State

If no hero matches:

- show a small text state: `Герой не найден`;
- do not allow export;
- do not create a custom hero.

## Builder State Requirements

Current state should move away from plain `heroName`.

Recommended state:

```ts
const [heroQuery, setHeroQuery] = useState("");
const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
```

Derived value:

```ts
const selectedHero = selectedHeroId ? getHeroById(selectedHeroId) : null;
const heroName = selectedHero?.name.ru ?? heroQuery;
```

Public hook API should expose:

- `heroQuery`;
- `selectedHeroId`;
- `selectedHero`;
- `setHeroQuery`;
- `selectHero(heroId: string)`;
- `clearSelectedHero()`;

On `selectHero(heroId)`:

- verify hero exists in local catalog;
- set `selectedHeroId`;
- set `heroQuery` to `hero.name.ru`.

On `setHeroQuery(value)`:

- update query;
- if value differs from selected hero Russian name, clear `selectedHeroId`.

## Validation Requirements

Validation must check hero identity and equipment completeness.

Add validation source:

```ts
type ValidationSources = {
  heroes: readonly { id: string; name: { ru: string; en: string } }[];
  artifacts: readonly { id: string }[];
  runes: readonly { id: string }[];
  // existing sources...
};
```

Hero validation:

- if `heroId` is `null` or empty:
  - code: `hero.required`;
  - message: `Выберите героя из списка.`;
  - path: `heroId`;
- if `heroId` is not found in catalog:
  - code: `hero.unknown`;
  - message: `Выбранный герой отсутствует в базе.`;
  - path: `heroId`;
- if `heroName` does not equal catalog `hero.name.ru` for selected `heroId`:
  - code: `hero.nameMismatch`;
  - message: `Имя героя должно соответствовать выбранному герою из базы.`;
  - path: `heroName`.

Equipment validation:

- `equipment.artifactIds` must be an array with at least one item;
- every artifact id must exist in `artifacts.json`;
- duplicate artifact ids are invalid;
- `equipment.runeIds` must be an array with at least one item;
- every rune id must exist in `runes.json`;
- duplicate rune ids are invalid.

Existing rune validation should remain mandatory. Empty rune variants are not allowed.

## Export Requirements

`buildExport()` should return `null` if:

- hero is not selected from catalog;
- selected hero id does not exist;
- weapon variants are empty;
- rune variants are empty;
- any existing required section is incomplete.

Export object must include:

- `heroId`;
- `heroName` from catalog Russian name;
- existing `gameMode`;
- existing `targetTabPath`;
- existing `columns`;
- existing `majorNodes`;
- existing `weaponAwakening`;
- existing `equipment.artifactIds`;
- existing `equipment.runeIds`;
- existing `progress`;
- existing `activeNodes`;
- existing `metadata`.

Download file naming:

- use `heroId` as base file name;
- do not transliterate Russian `heroName` for the exported builder file.

Example:

```ts
downloadJson(build, build.heroId);
```

## UI Requirements

The hero field should be placed where the current hero name input is placed.

Visual requirements:

- label: `Герой`;
- selected state is visually clear;
- invalid/free-typed state is visually different from selected state;
- dropdown does not cover important controls permanently;
- on mobile, dropdown should remain usable within the scroll screen;
- selected hero can be changed by editing the input.

Recommended selected-state details:

- show hero icon inside the input or selected row;
- show Russian hero name as primary text;
- show a small confirmation state such as border highlight, check icon, or selected row style.

Avoid:

- allowing a free-text custom hero;
- silently auto-selecting the first match without user action;
- saving by Russian name lookup during export.

## Error Display

Existing `DownloadJsonButton` error list should show the new hero validation errors.

Recommended error order:

1. hero selection;
2. target mode/tab if invalid;
3. equipment weapon/rune errors;
4. branches;
5. major nodes;
6. weapon awakening.

The first invalid export attempt should scroll to the error block as it does now.

## Tests

Update or add tests for the hook:

- initial builder state has no selected hero;
- typing search query does not create a valid hero selection;
- selecting a hero sets `selectedHeroId` and Russian `heroName`;
- editing text after selecting a hero clears `selectedHeroId`;
- export contains `heroId` and catalog Russian `heroName`;
- export returns `null` without selected hero;
- export preserves `equipment.artifactIds` and `equipment.runeIds`.

Update or add validation tests:

- missing hero id returns `hero.required`;
- unknown hero id returns `hero.unknown`;
- mismatched hero name returns `hero.nameMismatch`;
- empty rune ids return `equipment.runeRequired`;
- empty artifact ids return `equipment.artifactRequired`;
- valid selected hero and non-empty equipment passes hero/equipment validation.

Update or add component tests:

- search by Russian name shows matching hero;
- search by English name shows matching hero;
- search by id shows matching hero;
- selecting a dropdown option calls `selectHero`;
- arbitrary typed text without selection is not treated as selected;
- no matches shows `Герой не найден`.

Update screen test:

- user can search and select a hero before export;
- export button shows hero error if text was typed but no dropdown option was selected.

## Acceptance Criteria

- The builder no longer has a free-text-only hero field.
- A hero build can only be exported after selecting a hero from `heroes.json`.
- Exported builder JSON contains `heroId`.
- Exported `heroName` is the Russian name from the selected hero catalog record.
- Export file naming uses `heroId`.
- Empty rune variants block export.
- Empty weapon variants block export.
- Unknown or duplicate rune/weapon ids still block export.
- Existing branch, major node, weapon awakening, mode, and tab behavior remains unchanged.
- Tests cover hero selection, mandatory rune variants, mandatory weapon variants, and export shape.

## Out Of Scope

- Creating new heroes from the builder.
- Editing `heroes.json` from the UI.
- Automatically inserting exported build JSON into `builds/{heroId}.json`.
- Server-side persistence.
- Changing the public hero build viewer UI.
- Migrating existing committed build files beyond adding compatibility for `heroId` where needed.
