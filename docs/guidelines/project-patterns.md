# Project Patterns

## Status

- These rules are project-specific patterns for MH Calculator.
- These rules MUST preserve product behavior while guiding future refactor work.
- Current violations MUST be treated as refactor targets, not patterns to copy.

## Game Data Catalogs

- Local JSON files in `src/features/game-data` MUST be the runtime source of truth for game catalogs.
- Runtime calls to external wiki or game-data URLs are FORBIDDEN.
- Catalog helpers MUST live near the catalog they serve.
- Catalog helpers MUST expose stable, typed access to local data instead of leaking raw lookup details into screens.
- Catalog relationship and asset reference integrity tests SHOULD be added or kept near game-data.

## Hero Catalog And Builds

- The master hero catalog and prepared hero builds MUST remain separate.
- User-facing build lists MUST use build-ready collections such as `heroesWithBuilds`.
- Hero and build lookup MUST use stable ids such as `heroId`.
- Display labels MUST NOT be used as source-of-truth identifiers for hero or build relationships.
- Hero catalog and viewer rules MUST preserve behavior documented in `docs/hero-builds-spec.md`.

## Builder Draft Validation Export

- Builder features MUST separate draft state, validation, and export.
- Validation MUST be implemented as pure logic separate from draft state and export shaping.
- Exported JSON MUST include `schemaVersion`.
- Exported JSON MUST use stable ids instead of display labels as source-of-truth fields.
- Admin builder code MAY depend on game-data and admin-specific controls.
- Builder export behavior MUST preserve the existing approved JSON contract unless a spec changes it.
- The complete admin builder workflow MUST preserve `docs/divinity-branch-builder-spec.md`.

## Build Presentation

- Reusable build presentation components MUST live in `src/features/builds/components`.
- Build UI types shared by admin and user-facing build screens MUST live in `src/features/builds/types`.
- Hero-specific metadata, filters, grouping, and hero list UI MUST remain in `src/features/heroes`.
- Admin-specific editing controls MUST remain in `src/features/admin`.

## Asset Paths

- Data files MUST store asset paths as `/img/...`.
- Runtime rendering MUST resolve local assets through `resolveAssetUri` or an approved shared replacement.
- An approved shared replacement MUST live in `src/shared` and MUST be named in a guideline, product spec, or refactor plan before feature code adopts it.
- Missing optional icons MUST render a controlled placeholder or omit the icon without crashing.
- Asset paths MUST NOT use unstable relative filesystem paths in game data.

## Divinity Calculators

- Divinity calculation functions MUST be pure.
- Divinity storage MUST stay isolated from calculation and rendering.
- Divinity UI MUST render derived state and call explicit actions rather than mutate calculation data directly.
- `src/features/divinity/ui` is currently an allowed local convention for divinity presentation components.
- Do not introduce new `ui` folders without updating architecture guidelines and boundary tests.
- Divinity calculator behavior MUST preserve the product rules in `docs/divinity-screen-spec.md`.

## Antique Calculator

- Antique inputs MUST be normalized before calculation and persistence.
- Cascading rewards MUST be calculated sequentially from the local reward catalog.
- Verified and unresolved game resource metadata MUST remain distinct.
- Antique behavior MUST preserve `docs/antique-rivalry-spec.md`.

## Admin Boundaries

- User-facing features MUST NOT depend on admin components.
- User-facing features MUST NOT depend on admin-only types.
- Generic display helpers MUST move to `src/shared` when used by both admin and user-facing screens.
- Build-specific display helpers MUST move to `src/features/builds`.
- Shared build contracts MUST move to a neutral owner before more features depend on them.
- Admin code MAY depend on game-data, but game-data MUST NOT depend on admin code.

## Tests And Integrity Checks

- Catalog relationship and asset reference integrity tests SHOULD be added or kept near game-data.
- Tests for pure validation, export shaping, and divinity calculations SHOULD run without rendering React components.
- Integrity checks MUST protect stable ids used by saved data, exported JSON, hero builds, and asset references.
- Tests MUST NOT require runtime access to external wiki or game-data URLs.

## Refactor Targets

- Add or document public APIs for features.
- Keep data integrity tests for catalog relationships and asset references.
- Standardize when feature-local presentation folders are named `ui` versus `components`.
