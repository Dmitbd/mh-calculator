# Architecture Guidelines

## Status

These rules describe the required current architecture.

Production import boundaries are enforced by `npm run architecture:check`. An intentional boundary change MUST update this document, the executable rule and its fixture tests in the same change; broad allowlists for an unexplained violation are forbidden.

## Directory Ownership

- `app/` MUST contain thin Expo Router entrypoints only.
- `src/features/<feature>/` MUST own feature-specific screens, presentation components, hooks, model, storage, stateless transformations, types, feature data/transport, and tests when those concerns exist.
- Feature folders MUST NOT create empty directories only to satisfy the ownership list.
- `src/features/auth/` MUST own the reusable administrative session/claim contract; consumers use only its public `index.ts` API.
- `src/features/builds/` MUST contain reusable build presentation components and build UI types shared by admin and user-facing build screens.
- `src/features/builds/data/` MUST own the public hero-build bootstrap/snapshot transport, generated published-build fallback, typed database schema and build-specific Supabase client adapter.
- `src/features/game-data/` MUST contain local read-only game catalogs and pure helpers around those catalogs, including divinity level costs.
- `src/shared/` MUST contain reusable UI and library code with no game-domain knowledge; its Supabase factory is generic and database contracts remain feature-owned.
- `src/types/` MUST be reserved for ambient or truly global types.
- `public/img/` MUST contain local runtime assets referenced by stable `/img/...` paths.
- `docs/` MUST contain permanent capability specs, guidelines, release history, backlog, and other durable project documentation. Temporary plans remain local and untracked.

## Import Boundaries

- `app -> src/features` is allowed only for direct route-to-screen composition; the dynamic hero route may additionally read `src/features/game-data/heroes/index.ts` for `generateStaticParams`.
- `app/_layout.tsx -> src/shared/ui/AppErrorBoundary.tsx` is the only current shared route-wrapper edge; another wrapper requires an explicit rule update.
- `src/features/* -> src/shared` is allowed.
- User-facing and admin features MAY read `src/features/game-data`.
- `src/features/admin` and `src/features/heroes` MAY use reusable build presentation/data modules only through `src/features/builds/index.ts`.
- Canonical catalog/domain build types MAY remain under `src/features/game-data/builds`, but admin and hero production code MUST receive those contracts only as type re-exports from the exact `@/features/builds` public API.
- `src/features/game-data -> src/features/*/screens` is FORBIDDEN.
- `src/features/game-data -> src/features/*/ui` is FORBIDDEN.
- `src/features/game-data -> src/features/*/components` is FORBIDDEN.
- `src/features/game-data -> src/features/admin` is FORBIDDEN.
- `src/features/game-data` MUST NOT import feature UI, screens, components, or admin code.
- Cross-feature imports are FORBIDDEN by default. A feature may import its own internals and approved `game-data` catalog APIs.
- A cross-feature type, helper, or component used by multiple features MUST move to a neutral owner before reuse.
- Build-specific reusable UI MUST live in `src/features/builds`, not `src/shared`.
- Shared contracts MUST NOT live under `src/features/admin`.
- Only `src/features/admin` and `src/features/heroes` currently consume `auth` or `builds`; cross-feature imports MUST use the exact aliases `@/features/auth` and `@/features/builds`. `.../index` and relative paths are not equivalent public entrypoints. Self-imports inside each owner remain local and MUST NOT loop through its own barrel.
- Other feature internals SHOULD be consumed through explicit public APIs when cross-feature reuse is approved.
- Feature public APIs SHOULD be explicit `index.ts` exports or documented module entrypoints.
- Game-data approved APIs SHOULD be catalog helper modules located near the data they expose.
- The executable import graph MUST resolve alias, relative, re-export, `import type`, inline `import("...").Type`, multiline, literal `require` and dynamic imports (including import attributes) through the project TypeScript configuration. Regex source searches MUST NOT be presented as complete import-boundary enforcement.
- Architecture import checks MUST exclude test and testing-fixture sources explicitly; production rules apply to `app`, `src/features` and `src/shared`. A production source MUST NOT import or re-export any module under `__tests__`/`testing` or named `*.test.*`/`*.spec.*`, because that would turn excluded code into an unchecked runtime dependency. Because inline declarations and type re-export facades can evade a direct consumer edge, the same gate scans production `src/shared` for reserved game-domain contract identifiers and forbids canonical build-contract exports from `game-data` modules outside `game-data/builds`.
- Every compiler-resolved production module under `src/features` and `src/shared`, including imported JSON catalogs, MUST be reachable from an `app/*` entrypoint through the production import/re-export graph. Mutual imports inside a disconnected island do not establish use. A public barrel without an application path is dead code, not a speculative API; any future non-route entrypoint requires a narrow documented rule and fixture before it is added.
- `tsconfig.production.json` MUST cover production `app` and `src` with unused locals/parameters enabled while excluding `__tests__`, test/spec files, testing fixtures, E2E and generated artifacts. It MUST NOT exclude a production owner merely to hide a diagnostic.
- Jest discovery MUST be limited to `app`, `src` and `scripts`; `.worktrees` MUST remain excluded from test discovery, the module map and file watching. `jest.setup.js` installs the shared console guard after the test environment is available, so feature tests cannot establish local warning-suppression policies.

## Route Rules

- Route files MUST only read route params or search params, expose `generateStaticParams` when static generation is needed, and render feature screens.
- Business logic, state orchestration, calculations, storage access, and section-level UI MUST NOT live in `app/`.
- Route files SHOULD pass only route-derived inputs and route-level wrapper props into feature screens.
- A dynamic route MAY read an approved game-data public API only to implement `generateStaticParams`; it MUST NOT deep-import the catalog implementation.

## Feature Rules

- Feature folders MUST own `screens`, `ui` or `components`, `hooks`, `model`, `storage`, `utils`, `types`, `data`, and `__tests__` responsibilities only when those concerns exist.
- Feature folders MUST NOT add placeholder directories for responsibilities they do not yet need.
- `screens` MUST compose feature UI and connect feature state for route-level experiences.
- New feature presentation folders SHOULD be named `components`.
- Existing `src/features/divinity/ui` is an allowed legacy exception until a dedicated rename is scheduled.
- `hooks` MUST coordinate feature state, effects, and orchestration without rendering UI.
- `model` MUST contain domain calculations, state transitions, validation, and other rules with feature meaning.
- Feature `utils` MUST contain small stateless transformations or view mappers owned by that feature; a helper reused across unrelated features moves to a neutral owner.
- `storage` MUST isolate persistence reads, writes, migrations, and serialization from calculations and UI.
- `types` MUST contain feature-owned contracts; cross-feature types are exported only by an approved neutral owner such as `builds`, `auth` or `game-data`.
- `data` MUST contain feature-owned acquisition, transport, generated fallback or static data that is not a shared game catalog. Read-only game catalogs belong to `game-data`.
- `__tests__` SHOULD contain focused tests near the feature behavior they cover.

## Game Data Rules

- `src/features/game-data/` MUST contain read-only runtime catalog data plus pure helpers around those catalogs.
- Generated application content such as published hero-build snapshots MUST live with its feature pipeline, not under `game-data`.
- `src/features/game-data/` MUST NOT depend on admin, user-facing UI, feature screens, feature components, storage, or route code.
- Game data helpers MUST stay pure and MUST NOT perform rendering, navigation, persistence, or network access.
- User-facing and admin features MAY read game data catalogs through approved helper APIs.

## Shared Code Rules

- `src/shared/` MUST contain reusable UI and library code only.
- Shared code MUST NOT know about heroes, divinity, builds, admin, or other game-specific domains.
- Shared diagnostics MUST remain a bounded string transport; feature-owned wrappers define event names and allowlisted attributes.
- Shared UI MUST accept generic props and MUST NOT import feature-owned types unless those types have moved to a neutral owner.
- Shared libraries SHOULD prefer framework-neutral helpers unless React Native behavior is the explicit responsibility.
- Shared infrastructure MAY expose a generic typed factory, but a feature-specific database type and configured adapter MUST stay with that feature owner.

## Asset Rules

- Runtime assets MUST live under `public/img/` and MUST be referenced by stable `/img/...` paths.
- Feature data MUST NOT reference unstable relative filesystem paths for runtime images.
- Asset helpers SHOULD live in `src/shared/` only when they are generic and have no game-domain knowledge.

## Documentation Rules

- `docs/` MUST store permanent capability-level product specs, the capability catalog, changelog, guidelines, and other durable project documentation.
- Product behavior specs in `docs/*-spec.md` MUST continue to govern user-facing behavior.
- A tab, mode, field, filter, or isolated task MUST update its parent capability spec instead of creating another permanent spec.
- `docs/README.md` MUST list every standalone application capability and link to its spec.
- Every route MUST occur in exactly one capability section of `docs/README.md`; the navigation shell `/` is the only current explicitly documented route without a capability spec.
- Product decisions about forms, branches, modes and failure actions MUST live in the owning capability spec according to `docs/guidelines/product-contracts.md`.
- User-visible changes MUST update `docs/CHANGELOG.md#unreleased` in the same change.
- `docs/superpowers/`, `.superpowers/`, brainstorming notes, and implementation plans MUST remain local and MUST NOT be tracked. Temporary Markdown paths use an explicit `brainstorm`, `plan` or `plans` marker so `npm run docs:check` can reject them anywhere in the Git index.
- Guidelines MUST govern placement, import boundaries, style, and repeatable project patterns.
- Any known architecture exception MUST be narrow, documented with an owner and removal condition, and represented honestly in the executable gate.
- `npm run docs:check` MUST remain in `npm run verify` and enforce route ownership, spec/guideline discovery, inline/reference-style local targets and Markdown heading fragments.
- `npm run typecheck:unused` MUST remain after the ordinary TypeScript check in `npm run verify`; the ordinary check keeps the full test graph typed, while the second gate rejects unused production symbols and standalone `void` expressions without a call, without forcing test helper imports to be artificially consumed.

## Refactor Targets

- Standardize when a feature uses `ui` versus `components`.
- Introduce or extend feature public APIs only when approved cross-feature reuse requires them.
- Keep tightening screen-level orchestration when pure view-model mapping appears during feature work.
