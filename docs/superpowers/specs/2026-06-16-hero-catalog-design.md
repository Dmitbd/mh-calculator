# Hero Catalog and Build List Specification

Date: 2026-06-16

## Goal

Create a complete local master database of Mythic Heroes UR/SSR heroes and update the hero builds list so it can filter and group only heroes that have ready builds.

The app must keep two separate concepts:

- Master hero catalog: all UR and SSR heroes from Mythic Heroes.
- Build catalog: only heroes that have at least one prepared build in the project.

Heroes without builds must exist in data, but must not appear on the "Hero Builds" screen.

Primary source for initial data:
https://mythic-heroes.fandom.com/wiki/Hero_List

Only UR and SSR heroes are in scope. SR heroes and lower rarities are out of scope.

## Current Project Context

The project already has a hero build feature:

- `src/features/game-data/heroes/heroes.json`
- `src/features/game-data/heroes/heroBuilds.ts`
- `src/features/game-data/heroes/builds/bastet.json`
- `src/features/heroes/screens/HeroSelectScreen.tsx`
- `src/features/heroes/screens/HeroBuildScreen.tsx`

Current `heroes.json` contains only Bastet and already points to `/img/heroes/bastet.png`, but `public/img/heroes/` does not exist yet. The new work should formalize this asset structure and fill the master database.

## Data Architecture

Use JSON game-data files and local public assets. Do not load hero data or images from Fandom at runtime.

### Master Hero Catalog

File:

`src/features/game-data/heroes/heroes.json`

Each hero stores factual fields and references dictionary ids for repeated concepts:

```json
{
  "id": "bastet",
  "name": {
    "en": "Bastet",
    "ru": "Бастет"
  },
  "icon": "/img/heroes/bastet.png",
  "rarity": "ssr",
  "role": "fighter",
  "damageType": "physical",
  "element": "water",
  "factions": ["verdian"],
  "releaseDate": "2025-02-02"
}
```

Field rules:

- `id`: stable kebab-case slug. It must match the hero image filename and future build filename.
- `name.en`: English source name from Fandom.
- `name.ru`: Russian UI name.
- `icon`: local path under `public/img/heroes`.
- `rarity`: dictionary id, only `ur` or `ssr`.
- `role`: dictionary id, one of `fighter`, `tank`, `mage`, `support`.
- `damageType`: `physical`, `magical`, or `null`.
- `element`: dictionary id, one of `fire`, `water`, `earth`, `wind`, `metal`.
- `factions`: array of faction ids. UR heroes can have two factions.
- `releaseDate`: ISO date when known. If source has only month/year, store `null` and optionally add a later explicit metadata field only when needed.

### Dictionaries

Create dictionary files next to `heroes.json`.

File:

`src/features/game-data/heroes/rarities.json`

Entries:

- `ur`
- `ssr`

Each entry should include:

- `id`
- `name.en`
- `name.ru`
- `icon`
- `order`

File:

`src/features/game-data/heroes/roles.json`

Entries:

- `fighter`
- `tank`
- `mage`
- `support`

Each entry should include:

- `id`
- `name.en`
- `name.ru`
- `icon`
- `order`

Fandom mapping:

- `Physical Fighter` -> `role: "fighter"`, `damageType: "physical"`
- `Magical Fighter` -> `role: "mage"`, `damageType: "magical"`
- `Tank` -> `role: "tank"`, `damageType: null`
- `Support` -> `role: "support"`, `damageType: null`

File:

`src/features/game-data/heroes/factions.json`

Entries:

- `luminarch`
- `shadowarch`
- `guardian`
- `verdian`

Each entry should include:

- `id`
- `name.en`
- `name.ru`
- `icon`
- `order`

Russian UI names:

- `luminarch`: `Свет`
- `shadowarch`: `Тьма`
- `guardian`: `Хранители`
- `verdian`: `Лес`

File:

`src/features/game-data/heroes/elements.json`

Entries:

- `fire`
- `water`
- `earth`
- `wind`
- `metal`

Each entry should include:

- `id`
- `name.en`
- `name.ru`
- `icon`
- `order`

## Asset Architecture

All hero-related assets must be local.

Recommended paths:

- `public/img/heroes/{heroId}.png`
- `public/img/hero-roles/{roleId}.png`
- `public/img/hero-rarities/{rarityId}.png`
- `public/img/hero-factions/{factionId}.png`
- `public/img/hero-elements/{elementId}.png`

Runtime app code must not use external Fandom image URLs.

Existing asset resolution through `resolveAssetUri` should continue to work because paths remain `/img/...`.

If an asset is missing, UI should not crash. Existing placeholder behavior in `IconPreview` can be reused or generalized.

## Build Registry

Build files stay separate:

`src/features/game-data/heroes/builds/{heroId}.json`

Current example:

`src/features/game-data/heroes/builds/bastet.json`

`src/features/game-data/heroes/heroBuilds.ts` should remain the build registry and import only heroes that have prepared builds.

It should export:

- `heroes`: full master hero catalog.
- `heroBuilds`: build registry keyed by hero id.
- `heroesWithBuilds`: heroes with at least one non-null build.
- `getHeroById(heroId)`: lookup in the full master catalog.
- `getHeroBuildSet(heroId)`: lookup in the build registry.

The user-facing hero builds list must use `heroesWithBuilds`, not the full `heroes` array.

## Hero Builds Screen Requirements

Screen:

`src/features/heroes/screens/HeroSelectScreen.tsx`

The screen should become a filtered, grouped list of heroes that have ready builds.

### Filters

Add filter controls above the hero list.

Required filters:

- Search by hero name.
- Filter by role.
- Filter by faction.
- Filter by element.

Search behavior:

- Search must match `name.ru`.
- Search should also match `name.en`.
- Matching should be case-insensitive.
- Leading and trailing spaces should be ignored.

Role filter:

- Options are loaded from `roles.json`.
- Include an "all roles" state.

Faction filter:

- Options are loaded from `factions.json`.
- Include an "all factions" state.
- A hero with multiple factions should match any selected faction.

Element filter:

- Options are loaded from `elements.json`.
- Include an "all elements" state.

Filter combination:

- Filters combine with AND logic.
- Example: search `ba` + role `fighter` + faction `verdian` should show Bastet if she has a build.
- Heroes without builds must never appear even if they match filters.

### Grouping Zones

Filtered heroes must be displayed below the filters in fixed zones.

Zones:

1. UR heroes
2. Light heroes, SSR only
3. Dark heroes, SSR only
4. Guardian heroes, SSR only
5. Forest heroes, SSR only

Zone mapping:

- `UR heroes`: `rarity === "ur"`
- `Light heroes`: `rarity === "ssr"` and `factions` contains `luminarch`
- `Dark heroes`: `rarity === "ssr"` and `factions` contains `shadowarch`
- `Guardian heroes`: `rarity === "ssr"` and `factions` contains `guardian`
- `Forest heroes`: `rarity === "ssr"` and `factions` contains `verdian`

Suggested Russian zone titles:

- `UR герои`
- `Герои света`
- `Герои тьмы`
- `Герои хранителей`
- `Герои леса`

Empty zones:

- Empty zones should be hidden after filters are applied.
- If all zones are empty, show a compact empty state.

Sorting:

- Zones must always render in the fixed order listed above.
- Inside each zone, sort by `name.ru` alphabetically.
- If `name.ru` is missing during data entry, fall back to `name.en`.

### Hero Row/Card Content

Each hero item should show:

- Hero image.
- Russian hero name.
- Rarity icon.
- Role icon.
- Faction icon or icons.
- Element icon.

The row/card should navigate to `/heroes/[heroId]`.

Do not add heroes without builds to this list.

## Hero Build Detail Screen Requirements

Screen:

`src/features/heroes/screens/HeroBuildScreen.tsx`

The existing build detail behavior should remain.

Updates:

- Use `hero.name.ru` for UI titles.
- It is acceptable to add a compact metadata row near the top with rarity, role, faction, and element icons.
- Existing behavior for missing mode builds should remain: show the "build not ready" placeholder for unavailable modes.

## Error Handling

The app should not crash when optional display metadata is missing.

Expected behavior:

- Missing hero image: show placeholder.
- Missing dictionary entry: omit that icon or show a text fallback.
- Missing hero for a build registry key: tests should fail.
- Build file exists but both `pve` and `pvp` are `null`: hero should not appear in `heroesWithBuilds`.

## Tests

Add focused tests for data integrity and screen behavior.

### Data Integrity Tests

Test the master hero catalog:

- Every hero has `id`, `name.en`, `name.ru`, `icon`, `rarity`, `role`, `element`, and `factions`.
- Every hero rarity is `ur` or `ssr`.
- No SR or lower-rarity heroes exist in `heroes.json`.
- Every `rarity` exists in `rarities.json`.
- Every `role` exists in `roles.json`.
- Every `element` exists in `elements.json`.
- Every faction id exists in `factions.json`.
- Every hero id is unique.
- Every hero icon path starts with `/img/heroes/`.

Test the build registry:

- Every `heroBuilds` key exists in `heroes.json`.
- `heroesWithBuilds` includes only heroes with at least one non-null build.
- `heroesWithBuilds` excludes heroes whose build set is missing or fully null.

### Filter Tests

Test filtering logic independently from UI if helper functions are introduced.

Required cases:

- Search by Russian name.
- Search by English name.
- Filter by role.
- Filter by faction.
- Filter by element.
- Combined filters use AND logic.
- Heroes without builds are excluded before grouping.

### Grouping Tests

Required cases:

- UR heroes go to the UR zone.
- SSR Luminarch heroes go to the Light zone.
- SSR Shadowarch heroes go to the Dark zone.
- SSR Guardian heroes go to the Guardian zone.
- SSR Verdian heroes go to the Forest zone.
- Empty zones are removed.
- Zone order is stable.

### UI Tests

Update or add tests for `HeroSelectScreen`:

- Bastet appears when she has a build.
- Heroes from the master catalog without builds do not appear.
- Filters reduce the visible list.
- Empty state appears when filters match no build-ready heroes.

## Implementation Boundaries

In scope:

- Create the master UR/SSR hero database.
- Create dictionaries for rarity, role, faction, and element.
- Add local asset folders and expected asset paths.
- Keep build files separate from hero metadata.
- Update the hero builds list to filter and group build-ready heroes.
- Add tests for data integrity, filters, grouping, and screen behavior.

Out of scope:

- Runtime sync with Fandom.
- Showing a separate "All Heroes" screen.
- Showing heroes without builds on the user-facing build list.
- Changing the internal schema of existing build JSON files beyond linking them to richer hero metadata.
- Auto-downloading images during app runtime.

## Acceptance Criteria

The work is complete when:

- `heroes.json` contains all UR/SSR heroes and no SR heroes.
- Hero metadata uses dictionary ids instead of duplicated icon paths for rarity, role, faction, and element.
- All hero-related images and icons referenced by app data are local `/img/...` paths.
- The "Hero Builds" screen shows only heroes with ready builds.
- The "Hero Builds" screen supports search by name and filters by role, faction, and element.
- The hero list renders in the five required zones:
  1. UR heroes
  2. Light heroes, SSR only
  3. Dark heroes, SSR only
  4. Guardian heroes, SSR only
  5. Forest heroes, SSR only
- Filtering and grouping work together.
- Tests cover data integrity, build registry consistency, filtering, grouping, and UI behavior.
