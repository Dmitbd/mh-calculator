# Architecture Guidelines

## Status

These rules describe the target architecture after future refactoring.

Current violations are refactor targets, not patterns to copy.

## Directory Ownership

- `app/` MUST contain thin Expo Router entrypoints only.
- `src/features/<feature>/` MUST own feature-specific screens, UI, hooks, model, storage, utils, types, data, and tests when those concerns exist.
- Feature folders MUST NOT create empty directories only to satisfy the ownership list.
- `src/features/builds/` MUST contain reusable build presentation components and build UI types shared by admin and user-facing build screens.
- `src/features/game-data/` MUST contain local read-only game catalogs and pure helpers around those catalogs.
- `src/shared/` MUST contain reusable UI and library code with no game-domain knowledge.
- `src/types/` MUST be reserved for ambient or truly global types.
- `public/img/` MUST contain local runtime assets referenced by stable `/img/...` paths.
- `docs/` MUST contain permanent capability specs, guidelines, release history, backlog, and other durable project documentation. Temporary plans remain local and untracked.

## Import Boundaries

- `app -> src/features` is allowed only for route-to-screen composition.
- `app -> src/shared` is allowed for route-level wrappers only.
- `src/features/* -> src/shared` is allowed.
- User-facing and admin features MAY read `src/features/game-data`.
- User-facing and admin build workflows MAY use reusable build presentation modules from `src/features/builds`.
- `src/features/game-data -> src/features/*/screens` is FORBIDDEN.
- `src/features/game-data -> src/features/*/ui` is FORBIDDEN.
- `src/features/game-data -> src/features/*/components` is FORBIDDEN.
- `src/features/game-data -> src/features/admin` is FORBIDDEN.
- `src/features/game-data` MUST NOT import feature UI, screens, components, or admin code.
- Cross-feature imports are FORBIDDEN by default.
- A cross-feature type, helper, or component used by multiple features MUST move to a neutral owner before reuse.
- Build-specific reusable UI MUST live in `src/features/builds`, not `src/shared`.
- Shared contracts MUST NOT live under `src/features/admin`.
- Feature internals SHOULD be consumed through explicit public APIs after the refactor introduces them.
- Feature public APIs SHOULD be explicit `index.ts` exports or documented module entrypoints introduced by refactor work.
- Game-data approved APIs SHOULD be catalog helper modules located near the data they expose.

## Route Rules

- Route files MUST only read route params or search params, expose `generateStaticParams` when static generation is needed, and render feature screens.
- Business logic, state orchestration, calculations, storage access, and section-level UI MUST NOT live in `app/`.
- Route files SHOULD pass only route-derived inputs and route-level wrapper props into feature screens.

## Feature Rules

- Feature folders MUST own `screens`, `ui` or `components`, `hooks`, `model`, `storage`, `utils`, `types`, `data`, and `__tests__` responsibilities when those concerns exist.
- Feature folders MUST NOT add placeholder directories for responsibilities they do not yet need.
- `screens` MUST compose feature UI and connect feature state for route-level experiences.
- New feature presentation folders SHOULD be named `components`.
- Existing `src/features/divinity/ui` is an allowed legacy exception until a dedicated rename is scheduled.
- `hooks` MUST coordinate feature state, effects, and orchestration without rendering UI.
- `model` MUST contain domain calculations, state transitions, validation, and other rules with feature meaning.
- `utils` MUST contain small generic helpers that do not encode domain workflow or persistent state.
- `storage` MUST isolate persistence reads, writes, migrations, and serialization from calculations and UI.
- `types` MUST contain feature-owned types that are not ambient and are not shared contracts for other features.
- `data` MUST contain feature-owned static data that is not part of the shared game catalog.
- `__tests__` SHOULD contain focused tests near the feature behavior they cover.

## Game Data Rules

- `src/features/game-data/` MUST contain read-only runtime catalog data plus pure helpers around those catalogs.
- `src/features/game-data/` MUST NOT depend on admin, user-facing UI, feature screens, feature components, storage, or route code.
- Game data helpers MUST stay pure and MUST NOT perform rendering, navigation, persistence, or network access.
- User-facing and admin features MAY read game data catalogs through approved helper APIs.

## Shared Code Rules

- `src/shared/` MUST contain reusable UI and library code only.
- Shared code MUST NOT know about heroes, divinity, builds, admin, or other game-specific domains.
- Shared UI MUST accept generic props and MUST NOT import feature-owned types unless those types have moved to a neutral owner.
- Shared libraries SHOULD prefer framework-neutral helpers unless React Native behavior is the explicit responsibility.

## Asset Rules

- Runtime assets MUST live under `public/img/` and MUST be referenced by stable `/img/...` paths.
- Feature data MUST NOT reference unstable relative filesystem paths for runtime images.
- Asset helpers SHOULD live in `src/shared/` only when they are generic and have no game-domain knowledge.

## Documentation Rules

- `docs/` MUST store permanent capability-level product specs, the capability catalog, changelog, guidelines, and other durable project documentation.
- Product behavior specs in `docs/*-spec.md` MUST continue to govern user-facing behavior.
- A tab, mode, field, filter, or isolated task MUST update its parent capability spec instead of creating another permanent spec.
- `docs/README.md` MUST list every standalone application capability and link to its spec.
- User-visible changes MUST update `docs/CHANGELOG.md#unreleased` in the same change.
- `docs/superpowers/`, `.superpowers/`, brainstorming notes, and implementation plans MUST remain local and MUST NOT be tracked.
- Guidelines MUST govern placement, import boundaries, style, and repeatable project patterns.
- Current architecture violations MUST be documented as refactor targets before they are copied into new work.

## Refactor Targets

- Standardize when a feature uses `ui` versus `components`.
- Introduce feature public APIs only when they reduce unsafe deep imports.
- Keep tightening screen-level orchestration when pure view-model mapping appears during feature work.
