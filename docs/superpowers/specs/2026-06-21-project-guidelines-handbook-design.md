# Project Guidelines Handbook Design

Date: 2026-06-21

## Goal

Create a strict Markdown handbook for the future refactor of MH Calculator.

The handbook must define the target architecture after refactoring, even when the current codebase does not yet follow every rule. It must help future developers and agents place code in the correct directories, preserve project-specific patterns, and avoid cross-feature coupling.

## Scope

The handbook will live in `docs/guidelines/` and contain:

- `README.md` - entry point and reading order.
- `architecture.md` - target architecture, directory ownership, and import boundaries.
- `code-style.md` - TypeScript, React Native, testing, naming, and documentation rules.
- `project-patterns.md` - MH Calculator-specific data, asset, builder, and calculator patterns.

The handbook is normative documentation. It must use strict language:

- `MUST` for required rules.
- `SHOULD` for preferred rules with rare exceptions.
- `FORBIDDEN` for rules that must not be violated.

Short explanations are allowed only where they prevent misuse. The documents should not become tutorial-style prose.

## Current Project Context

The project is an Expo Router / React Native application.

Current top-level structure:

- `app/` - Expo Router routes.
- `src/features/` - feature and domain areas.
- `src/features/game-data/` - local game catalogs and helpers.
- `src/shared/` - shared UI and libraries.
- `src/types/` - global ambient types.
- `public/img/` - local image assets.
- `docs/` - product specs and design documents.

Important current feature areas:

- `features/divinity` - divinity calculator UI, model, storage, hooks, and data.
- `features/heroes` - hero build user-facing screens, components, utils, and types.
- `features/admin` - branch builder screen, components, hooks, validation, and export helpers.
- `features/game-data` - catalogs for heroes, divinity, equipment, and weapon awakening.

Known current architecture issues must be documented as refactor targets rather than silently normalized:

- Some user-facing hero components import `features/admin/components/IconPreview`.
- Some user-facing hero utilities and game-data helpers import types from `features/admin/types/admin.types`.
- `app/divinity.tsx` contains substantial screen logic instead of delegating to a feature screen.
- `features/admin/screens/DivinityBranchBuilderScreen.tsx` orchestrates many data imports and UI sections in one large screen.
- Naming is mixed between `components` and `ui` directories across features.
- Feature public APIs are implicit; most imports target internal files directly.

## Chosen Approach

Use a strict target handbook with explicit refactor targets.

This approach describes the intended architecture after future cleanup, while still acknowledging where the current code violates it. It avoids overfitting the rules to today's structure and avoids introducing a heavy enterprise architecture that would be too large for the project.

Rejected approaches:

- A full clean-architecture rewrite with many additional layers. This would be too heavy for the current app size.
- Minimal documentation of the current structure. This would not provide enough guidance for the planned refactor.

## Document Design

### `docs/guidelines/README.md`

The index must:

- Explain that the files are strict project rules for future implementation and refactoring.
- Define reading order: architecture first, then code style, then project patterns.
- State that feature-specific product specs in `docs/` still govern behavior, while guidelines govern placement, style, and boundaries.
- State that current violations are expected during transition and should be handled through explicit refactor tasks.

### `docs/guidelines/architecture.md`

The architecture document must define the target project structure:

- `app/` MUST contain thin Expo Router entrypoints only.
- Route files MUST read route/search params, call `generateStaticParams` when needed, and render feature screens.
- Business logic, state orchestration, calculations, storage access, and section-level UI MUST NOT live in `app/`.
- `src/features/<feature>/` MUST own feature-specific screens, UI/components, hooks, model, storage, utils, types, data, and tests.
- `src/features/game-data/` MUST own local read-only game catalogs and pure helpers around those catalogs.
- `src/shared/` MUST contain reusable UI and libraries that know nothing about heroes, divinity, admin, or game-specific domains.
- `public/img/...` MUST contain local runtime assets referenced by stable `/img/...` paths.
- `docs/` MUST contain product specs, implementation specs, plans, and guidelines.

The document must define import boundaries:

- `app -> features/shared` is allowed.
- `features -> shared` is allowed.
- User-facing and admin features may read `features/game-data`.
- `features/game-data -> feature UI/screens/admin` is FORBIDDEN.
- Cross-feature imports are FORBIDDEN by default.
- Shared contracts used by multiple features MUST live in a neutral place, not in `admin`.
- Feature internals SHOULD be consumed through explicit public APIs once the refactor introduces them.

The document must include refactor targets:

- Move shared build/export types out of `features/admin/types`.
- Move `IconPreview` or an equivalent generic image preview into `src/shared/ui`.
- Make `app/divinity.tsx` a thin route.
- Reduce orchestration in `DivinityBranchBuilderScreen` by extracting feature-specific sections.
- Standardize `components` vs `ui` directory usage.

### `docs/guidelines/code-style.md`

The style document must define strict TypeScript and React Native rules:

- `strict` TypeScript is mandatory.
- `any` is FORBIDDEN unless documented with a narrow reason.
- JSON data MUST be cast or normalized at the boundary into domain types.
- Pure calculation logic MUST live in `model` or `utils` and be tested without rendering UI.
- React components MUST use typed props near the component.
- Components SHOULD stay small and focused.
- `StyleSheet.create` SHOULD live at the bottom of React Native component files.
- Hooks MUST manage state or orchestration, not render UI or hide complex formatting logic.
- Comments MUST explain non-obvious decisions only.
- Tests MUST live near the feature in `__tests__`.
- Naming MUST be consistent:
  - Components and exported types use `PascalCase`.
  - Functions, variables, hooks, and local values use `camelCase`.
  - Hook names start with `use`.
  - JSON ids, filenames for game objects, and asset filenames use `kebab-case`.

The document must also define UI string rules:

- Current Russian labels may remain inline in UI components.
- Domain ids MUST NOT be rendered directly as user-facing labels when a dictionary lookup exists.

### `docs/guidelines/project-patterns.md`

The project patterns document must capture MH Calculator-specific rules:

- Game data catalogs are local JSON sources of truth.
- Catalog helpers and integrity tests MUST live near their data.
- Runtime loading from external game/wiki URLs is FORBIDDEN.
- Hero master catalog and hero build catalog MUST remain separate.
- User-facing hero build lists MUST use build-ready collections such as `heroesWithBuilds`, not the full master catalog.
- Hero/build lookup MUST use stable ids such as `heroId`.
- Builder flows MUST separate draft state, validation, and export.
- Export JSON MUST include `schemaVersion` and stable ids.
- Asset paths in data MUST use `/img/...` and rendering MUST go through `resolveAssetUri` or an approved shared asset helper.
- Divinity calculation functions MUST be pure.
- Divinity storage MUST stay isolated from calculation and rendering.
- Admin features MAY depend on game-data and admin-specific builder components.
- User-facing features MUST NOT depend on admin components or admin-only types.

The document must include refactor targets:

- Neutralize shared build types.
- Move generic preview components to `shared`.
- Add or document public APIs for features.
- Keep data integrity tests for catalog relationships and asset references.

## Acceptance Criteria

The final implementation is complete when:

- `docs/guidelines/README.md` exists and points to all guideline files.
- `docs/guidelines/architecture.md` exists and defines target directories, ownership, and import boundaries.
- `docs/guidelines/code-style.md` exists and defines strict TypeScript, React Native, testing, naming, and comment rules.
- `docs/guidelines/project-patterns.md` exists and defines MH Calculator-specific data, asset, builder, admin, hero, and divinity patterns.
- The documents clearly distinguish target rules from current refactor targets.
- The documents do not require an immediate full clean-architecture rewrite.
- The documents are concise enough to be used by future agents before touching code.

## Out of Scope

This design does not implement the actual architecture refactor.

This design does not move files, rename directories, introduce public API barrels, or change production code.

This design does not add automated lint rules for boundaries. Those can be considered in a later task.

## Next Step

After this design is reviewed and approved, create an implementation plan for the four Markdown guideline files.
