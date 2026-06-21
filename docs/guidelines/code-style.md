# Code Style Guidelines

## Status

- These rules are strict defaults for implementation and future refactors.
- Current code may violate these rules; new code MUST NOT copy current violations.
- Refactors SHOULD move existing code toward these rules without changing product behavior.

## TypeScript

- `strict` TypeScript MUST remain enabled.
- `any` is FORBIDDEN unless the reason is narrow and documented near the boundary.
- Domain types MUST be explicit and exported from the owning feature or neutral shared contract.
- Optional fields MUST mean something specific; they MUST NOT be added for speculative future data.
- Type assertions MUST stay near external, JSON, platform, or library boundaries.
- Shared contracts used by multiple features MUST live in a neutral owner.
- A neutral owner MUST be `src/shared` for domain-agnostic shared UI or library code, `src/features/game-data` for catalog/domain contracts, or `src/features/builds` for reusable build presentation contracts; `src/features/admin` is not neutral.

## React Native Components

- Components MUST receive typed props.
- Components and their props SHOULD be easy to read without opening unrelated files.
- Components SHOULD stay focused on rendering one concept.
- Screen components MAY orchestrate sections but MUST NOT hide pure calculations inside render logic.
- Complex render preparation SHOULD move to pure mappers, model code, or utilities.
- `StyleSheet.create` SHOULD live at the bottom of component files.

## Hooks

- Hooks MUST manage state, side effects, or orchestration.
- Hooks MUST NOT return JSX.
- Hooks MUST NOT format complex view models when a pure mapper would be clearer.
- Hook return values MUST be typed when inference would hide a public contract.
- Hook names MUST start with `use`.

## Model And Utility Code

- Pure calculations MUST live in `model` or `utils`.
- Pure calculations MUST be testable without rendering React components.
- Model code MUST NOT import React components, screens, or navigation entrypoints.
- Utilities SHOULD stay domain-specific unless reuse across features is proven.
- Cross-feature utility reuse MUST move through a neutral shared owner.

## JSON Data

- Trusted static project JSON MAY be cast near the import only with an explicit domain type and narrow reason.
- Untrusted, external, or generated JSON MUST be validated or normalized before broad use.
- JSON data MUST map to explicit domain types before reaching UI components.
- Optional JSON fields MUST mean something specific; they MUST NOT be added for speculative future data.
- Game object ids, JSON filenames, and asset filenames MUST use `kebab-case`.
- Domain ids MUST remain stable once referenced by saved data, exported data, or assets.

## Tests

- Tests MUST live near the feature in `__tests__`.
- Pure model and utility tests MUST run without rendering React components.
- Model and utility tests SHOULD assert edge cases and data boundaries.
- Screen and component tests SHOULD assert user-visible behavior.
- Tests MUST NOT depend on private implementation details when visible behavior can be asserted.

## Naming

- Components and exported types MUST use `PascalCase`.
- Functions, variables, hooks, and local values MUST use `camelCase`.
- Hook names MUST start with `use`.
- Game object ids, JSON filenames, and asset filenames MUST use `kebab-case`.
- Names SHOULD describe domain meaning instead of storage shape or UI placement.

## UI Text

- Current Russian UI labels MAY remain inline in UI components.
- Domain ids MUST NOT be rendered directly as user-facing labels when dictionary data exists.
- UI text SHOULD come from domain dictionaries when labels are reused or derived from game data.
- UI components MUST NOT invent fallback labels that hide missing dictionary data.

## Comments

- Comments MUST explain non-obvious decisions, constraints, or platform behavior.
- Comments MUST NOT restate what the next line of code does.
- Comments SHOULD be close to the decision or boundary they explain.
- TODO comments MUST name the missing follow-up clearly enough to become a refactor task.

## Refactor Targets

- Tighten `any` usage and broad casts when they are found; replace them with explicit domain types, validation, or boundary normalization.
- Extract complex render logic to pure mappers, model code, or utilities when it mixes calculation with JSX.
- Move shared types to neutral owners when they are reused across features.
- Add focused model and utility tests around edge cases before moving calculation code.
