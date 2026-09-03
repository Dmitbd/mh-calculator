# Code Style Guidelines

## Status

- These rules are strict defaults for current implementation and refactors.
- A known exception MUST be named in the architecture guidelines instead of being inferred from old code.
- Refactors MUST preserve the owning capability spec unless the product contract changes explicitly.

## TypeScript

- `strict` TypeScript MUST remain enabled.
- Production TypeScript in `app` and `src` MUST pass `npm run typecheck:unused`: the command rejects standalone `void` expressions without a call before running `noUnusedLocals` and `noUnusedParameters`; tests, testing fixtures, E2E and generated artifacts are excluded by the dedicated config instead of weakening the production rule. `void someAsyncCall()` remains the explicit fire-and-forget Promise pattern and is not a suppression.
- A production unused diagnostic MUST be resolved by removing the symbol or restoring its real consumer. Prefixing with `_`, adding `void`, broadening an exclusion or exporting a private leftover only to silence the gate is forbidden. An underscore is allowed only for an unavoidable positional callback slot or a destructuring omission that performs real data shaping; removable lifecycle/API parameters do not qualify.
- Exporting or mutually importing production symbols does not prove use. Every non-route production module MUST be reachable from an application entrypoint; disconnected modules, placeholder barrels and speculative public APIs are forbidden.
- `any` is FORBIDDEN unless the reason is narrow and documented near the boundary.
- Domain types MUST be explicit and exported from the owning feature or neutral shared contract.
- Optional fields MUST mean something specific; they MUST NOT be added for speculative future data.
- Type assertions MUST stay near external, JSON, platform, or library boundaries.
- Shared contracts used by multiple features MUST live in a neutral owner.
- A neutral owner MUST be `src/shared` for domain-agnostic shared UI or library code, `src/features/game-data` for catalog/domain contracts, `src/features/builds` for reusable build presentation/data contracts, or a focused capability such as `src/features/auth` when its public contract is consumed by multiple features; `src/features/admin` is not neutral.

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

- Feature domain calculations and state transitions MUST live in `model`; stateless feature transformations and view mappers MAY live in `utils`.
- Pure calculations MUST be testable without rendering React components.
- Model code MUST NOT import React components, screens, or navigation entrypoints.
- Feature utilities SHOULD stay owned by that feature until reuse across features is proven.
- Cross-feature utility reuse MUST move through a neutral owner and its explicit public API when one exists.

## JSON Data

- Trusted static project JSON MAY be cast near the import only with an explicit domain type and narrow reason.
- Static local JSON MAY be cast at catalog boundaries when integrity tests cover ids, relationships, and asset paths.
- Runtime validation SHOULD be added when JSON becomes generated, user-provided, remote, or frequently edited by non-developers.
- Untrusted, external, or generated JSON MUST be validated or normalized before broad use.
- JSON data MUST map to explicit domain types before reaching UI components.
- Optional JSON fields MUST mean something specific; they MUST NOT be added for speculative future data.
- Game object ids, JSON filenames, and asset filenames MUST use `kebab-case`.
- Domain ids MUST remain stable once referenced by saved data, server payloads, routes, or assets.

## Tests

- Tests MUST live near the feature in `__tests__`.
- Pure model and utility tests MUST run without rendering React components.
- Model and utility tests SHOULD assert edge cases and data boundaries.
- Screen and component tests SHOULD assert user-visible behavior.
- Tests MUST NOT depend on private implementation details when visible behavior can be asserted.
- Import-boundary tests MUST use the TypeScript import graph behind `npm run architecture:check`; regex or substring checks MAY remain only for narrow structural/content invariants and MUST NOT claim complete dependency coverage.
- Production imports from `__tests__`, `testing`, `*.test.*` or `*.spec.*` are forbidden even when a helper appears reusable; move proven runtime reuse to its owning production module.
- Architecture fixtures MUST cover alias, relative, re-export, `import type`, inline import types, multiline, literal `require` and dynamic imports with/without attributes plus every governed dependency direction and every narrow exception.
- Documentation checker fixtures MUST cover an undocumented or duplicated route, missing/orphan/required spec, broken local Markdown target, absent required index link, an untracked temporary-plan exclusion and rejection of the same path when tracked.
- Tooling fixtures MUST prove that the production unused-code config excludes tests/fixtures and that a temporary unused symbol under production source fails the real TypeScript command.
- Negative or subprocess fixtures MUST run in an isolated system temporary project and be removed recursively in `finally`; they MUST NOT create discoverable test or production files inside repository `app`, `src` or `scripts`, where concurrent Jest, TypeScript, architecture or export gates could observe them.
- Jest globally rejects every unexpected `console.error` and `console.warn`. A test MUST NOT replace or spy on these methods. An error or warning that is the behavior under test MUST be registered immediately before the action through `expectConsoleError` or `expectConsoleWarning` from `scripts/testing/consoleGuard.cjs`, with the exact full argument list; one registration permits exactly one matching call and must be consumed.
- `npm run test:ci` MUST collect coverage from production TypeScript in `app` and `src`; tests, explicit testing fixtures, declarations and generated data MAY be excluded. All four global metrics (statements, branches, functions and lines) MUST retain their measured baseline. Lowering a threshold or broadening an exclusion requires a documented architectural reason and a new full-suite measurement; a focused test MAY use a larger explicit timeout only when coverage instrumentation makes a proven asynchronous scenario exceed Jest's default.

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
