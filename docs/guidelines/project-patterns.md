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

## Builder Draft Validation And Server Payload

- Builder features MUST separate draft state, validation, and server payload assembly.
- Validation MUST be implemented as pure logic separate from draft state and payload shaping.
- Server JSON MUST include `schemaVersion` and MUST use stable ids instead of display labels as source-of-truth fields.
- JSON is the Supabase persistence/transport format, not a user-facing file import or export workflow. File actions MUST NOT be reintroduced without a new explicit product decision and an update to the capability spec.
- Admin builder code MAY depend on game-data and admin-specific controls.
- Builder server payload MUST preserve the existing approved JSON contract unless a spec changes it.
- The complete admin builder workflow MUST preserve `docs/divinity-branch-builder-spec.md`.

## Build Presentation

- Reusable build presentation components MUST live in `src/features/builds/components`.
- Build UI types shared by admin and user-facing build screens MUST live in `src/features/builds/types`.
- Hero-build tree and payload contracts, including `HeroBuildSet`, `HeroBuildTab` and `HeroBuildTabPath`, belong to `src/features/game-data/builds`; `src/features/game-data/heroes/types.ts` contains only hero-catalog contracts.
- Hero-build bootstrap, snapshot transport, cache, database schema and build-specific Supabase adapter MUST live in `src/features/builds/data` and be exposed to other features through `src/features/builds/index.ts`. The low-level factory in `src/shared` remains generic and MUST NOT import a feature database schema.
- Canonical payload types used by game-data catalogs MAY live in `src/features/game-data/builds`, but `admin` and `heroes` MUST consume their re-exports from `@/features/builds`; a direct game-data build-type import bypasses the owner boundary.
- Generated published-build fallback MUST live in `src/features/builds/data/generated/hero-builds`; update scripts, workflow paths and CODEOWNERS MUST move with that owner.
- Build-specific styling tokens MUST stay with build components and MUST NOT move to `src/shared`.
- Hero-specific metadata, filters, grouping, and hero list UI MUST remain in `src/features/heroes`.
- Hero-specific remote/fallback source selection and diagnostic event schemas MUST remain in `src/features/heroes/model`.
- Admin-specific editing controls MUST remain in `src/features/admin`.

## Asset Paths

- Data files MUST store asset paths as `/img/...`.
- Runtime rendering MUST resolve local assets through `resolveAssetUri` or an approved shared replacement.
- URL images that need stable loading/error UI SHOULD use shared `AppImage`; round icons SHOULD remain on `IconPreview`, which delegates loading to that boundary.
- An approved shared replacement MUST live in `src/shared` and MUST be named in a guideline, product spec, or refactor plan before feature code adopts it.
- Missing optional icons MUST render a controlled placeholder or omit the icon without crashing.
- Asset paths MUST NOT use unstable relative filesystem paths in game data.

## Divinity Calculators

- Divinity calculation functions MUST be pure.
- Divinity level costs and their typed adapter MUST live in `src/features/game-data/divinity`; feature code consumes them through the catalog public API.
- Divinity storage MUST stay isolated from calculation and rendering.
- Divinity UI MUST render derived state and call explicit actions rather than mutate calculation data directly.
- `src/features/divinity/ui` is currently an allowed local convention for divinity presentation components.
- Do not introduce new `ui` folders without updating architecture guidelines and boundary tests.
- Divinity calculator behavior MUST preserve the product rules in `docs/divinity-screen-spec.md`.
- Divinity talent calculator behavior MUST preserve the range, cost snapshot, storage, and shared-tree rules in `docs/divinity-talent-calculator-spec.md`.

## Antique Calculator

- Antique inputs MUST be normalized before calculation and persistence.
- Cascading rewards MUST be calculated sequentially from the local reward catalog.
- Verified and unresolved game resource metadata MUST remain distinct.
- Antique behavior MUST preserve `docs/antique-rivalry-spec.md`.

## Admin Boundaries

- User-facing features MUST NOT depend on admin components.
- User-facing features MUST NOT depend on admin-only types.
- The shared administrative session/claim contract MUST live in `src/features/auth`; admin and hero consumers MUST import it only from `@/features/auth`.
- Auth MUST NOT depend on admin screens, hero screens, build UI or game catalogs.
- Generic display helpers MUST move to `src/shared` when used by both admin and user-facing screens.
- Build-specific display helpers MUST move to `src/features/builds`.
- Shared build contracts MUST have the neutral `src/features/builds` public facade and be consumed through `@/features/builds`; canonical payload declarations remain in `src/features/game-data/builds` as specified above.
- Admin code MAY depend on game-data, but game-data MUST NOT depend on admin code.
- Generic runtime diagnostics MUST carry only bounded strings; feature wrappers MUST own fixed event names and allowlisted attributes and MUST NOT accept raw errors, payloads, tokens or credentials.

## Tests And Integrity Checks

- Catalog relationship and asset reference integrity tests SHOULD be added or kept near game-data.
- Tests for pure validation, payload shaping, and divinity calculations SHOULD run without rendering React components.
- Integrity checks MUST protect stable ids used by saved data, server JSON, hero builds, and asset references.
- Tests MUST NOT require runtime access to external wiki or game-data URLs.
- `npm run architecture:check` MUST remain in `npm run verify` and MUST inspect production TypeScript imports through compiler resolution rather than source-text matching. It also rejects production modules under `src/features` and `src/shared` that are unreachable from all `app/*` entrypoints (including mutually importing dead islands), detects inline game-domain contract identifiers under otherwise domain-neutral `src/shared`, and rejects canonical build-contract exports from other `src/features/game-data` modules outside `src/features/game-data/builds`; the required and reachable `src/features/builds/index.ts` facade remains allowed.
- The dependency matrix in `scripts/check-architecture.cjs` and the human rules in `docs/guidelines/architecture.md` MUST change together; tests and fixtures are excluded from the production graph explicitly.
- Production modules MUST NOT import or re-export excluded test or testing-fixture modules; test-only placement is never a public runtime API.
- Admin and hero consumers MUST spell public owner imports exactly as `@/features/auth` and `@/features/builds`; relative paths and explicit `/index` suffixes are forbidden even when TypeScript resolves them to the same barrel.
- The architecture gate MUST also reject admin/hero imports from `src/features/game-data/builds`; catalog ownership is not a second public build API.
- The architecture gate MUST reject re-exporting canonical build contracts from any other `src/features/game-data` module; `@/features/builds` is the only consumer facade.
- `npm run docs:check` MUST keep every Expo route assigned to one capability spec and prevent stale product/guideline links.

## Refactor Targets

- Add or extend public APIs only for approved cross-feature reuse.
- Keep data integrity tests for catalog relationships and asset references.
- Standardize when feature-local presentation folders are named `ui` versus `components`.
