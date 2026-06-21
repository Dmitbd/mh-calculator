# Project Guidelines Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a strict Markdown handbook in `docs/guidelines/` that defines MH Calculator's target architecture, code style rules, and project-specific patterns for future refactoring.

**Architecture:** This is a documentation-only change. The handbook has one entry point and three focused rule documents: architecture boundaries, code style, and project patterns. It describes the target post-refactor architecture while explicitly listing current refactor targets.

**Tech Stack:** Markdown documentation for an Expo Router / React Native / TypeScript project.

---

## File Structure

- Create: `docs/guidelines/README.md`
  - Responsibility: Entry point, reading order, authority of each guideline file, and transition policy for current violations.
- Create: `docs/guidelines/architecture.md`
  - Responsibility: Target directories, ownership rules, import boundaries, dependency direction, and architecture refactor targets.
- Create: `docs/guidelines/code-style.md`
  - Responsibility: TypeScript, React Native, hooks, tests, comments, naming, JSON, and UI string rules.
- Create: `docs/guidelines/project-patterns.md`
  - Responsibility: MH Calculator-specific patterns for game data catalogs, hero builds, builder export, assets, divinity logic, admin boundaries, and refactor targets.

Reference documents:

- `docs/superpowers/specs/2026-06-21-project-guidelines-handbook-design.md`
- `README.md`
- `docs/divinity-screen-spec.md`
- `docs/divinity-branch-builder-spec.md`
- `docs/superpowers/specs/2026-06-16-hero-catalog-design.md`
- `docs/superpowers/specs/2026-06-16-hero-builder-validation-and-hero-select-design.md`

---

### Task 1: Create Guidelines Index

**Files:**
- Create: `docs/guidelines/README.md`

- [ ] **Step 1: Create the index file**

Create `docs/guidelines/README.md` with:

```markdown
# Project Guidelines

These documents are strict rules for future MH Calculator implementation and refactoring.

## Reading Order

1. Read `architecture.md` before moving or creating files.
2. Read `code-style.md` before editing TypeScript, React Native components, hooks, tests, or JSON data.
3. Read `project-patterns.md` before changing game data, hero builds, divinity logic, assets, builder flows, or admin tooling.

## Authority

- Product specs in `docs/` define user-facing behavior.
- Guidelines in this directory define placement, boundaries, style, and repeatable project patterns.
- When a product spec and a guideline appear to conflict, preserve product behavior and update the guideline or refactor plan explicitly.

## Transition Policy

The current codebase does not yet satisfy every target rule.

- New code MUST follow these guidelines.
- Refactors SHOULD move existing code toward these guidelines.
- Current violations MUST be listed as refactor targets instead of copied into new code.
```

- [ ] **Step 2: Verify the file exists**

Run: `test -f docs/guidelines/README.md`

Expected: command exits with status `0`.

- [ ] **Step 3: Review for strict tone**

Run: `sed -n '1,220p' docs/guidelines/README.md`

Expected: the file uses normative language and links conceptually to the three guideline files.

- [ ] **Step 4: Commit**

```bash
git add docs/guidelines/README.md
git commit -m "docs: add guidelines index"
```

---

### Task 2: Create Architecture Rules

**Files:**
- Create: `docs/guidelines/architecture.md`

- [ ] **Step 1: Create architecture sections**

Create `docs/guidelines/architecture.md` with these top-level sections:

```markdown
# Architecture Guidelines

## Status

These rules describe the target architecture after future refactoring.

## Directory Ownership

## Import Boundaries

## Route Rules

## Feature Rules

## Game Data Rules

## Shared Code Rules

## Asset Rules

## Documentation Rules

## Refactor Targets
```

- [ ] **Step 2: Add directory ownership rules**

Add strict rules:

```markdown
## Directory Ownership

- `app/` MUST contain thin Expo Router entrypoints only.
- `src/features/<feature>/` MUST contain feature-owned screens, UI, hooks, model, storage, utils, types, data, and tests.
- `src/features/game-data/` MUST contain local read-only game catalogs and pure helpers around those catalogs.
- `src/shared/` MUST contain reusable UI and library code with no game-domain knowledge.
- `src/types/` MUST be reserved for ambient or truly global types.
- `public/img/` MUST contain local runtime assets referenced by stable `/img/...` paths.
- `docs/` MUST contain product specs, plans, guidelines, and other project documentation.
```

- [ ] **Step 3: Add import boundary rules**

Add strict rules:

```markdown
## Import Boundaries

- `app -> src/features` is allowed only for route-to-screen composition.
- `app -> src/shared` is allowed for route-level wrappers only.
- `src/features/* -> src/shared` is allowed.
- User-facing and admin features MAY read `src/features/game-data`.
- `src/features/game-data -> src/features/*/screens` is FORBIDDEN.
- `src/features/game-data -> src/features/*/ui` is FORBIDDEN.
- `src/features/game-data -> src/features/*/components` is FORBIDDEN.
- `src/features/game-data -> src/features/admin` is FORBIDDEN.
- `src/features/game-data` MUST NOT import feature UI, screens, components, or admin code.
- Cross-feature imports are FORBIDDEN by default.
- A cross-feature type or helper used by multiple features MUST move to a neutral owner before reuse.
- Shared contracts MUST NOT live under `src/features/admin`.
- Feature internals SHOULD be consumed through explicit public APIs after the refactor introduces them.
```

- [ ] **Step 4: Add route and feature rules**

Include rules that route files must only read params, expose `generateStaticParams` when needed, and render feature screens. Include feature directory rules for `screens`, `ui` or `components`, `hooks`, `model`, `storage`, `utils`, `types`, `data`, and `__tests__`.

- [ ] **Step 5: Add refactor targets**

Include at least:

```markdown
## Refactor Targets

- Move shared build and export types out of `src/features/admin/types/admin.types.ts`.
- Move `IconPreview` or an equivalent generic image preview into `src/shared/ui`.
- Make `app/divinity.tsx` a thin route that renders a feature screen.
- Split large orchestration sections out of `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`.
- Standardize when a feature uses `ui` versus `components`.
- Introduce feature public APIs only when they reduce unsafe deep imports.
```

- [ ] **Step 6: Verify required terms**

Run:

```bash
rg "MUST|SHOULD|FORBIDDEN|Refactor Targets|Import Boundaries" docs/guidelines/architecture.md
```

Expected: output includes each required term/section.

- [ ] **Step 7: Commit**

```bash
git add docs/guidelines/architecture.md
git commit -m "docs: add architecture guidelines"
```

---

### Task 3: Create Code Style Rules

**Files:**
- Create: `docs/guidelines/code-style.md`

- [ ] **Step 1: Create code style sections**

Create `docs/guidelines/code-style.md` with these top-level sections:

```markdown
# Code Style Guidelines

## Status

## TypeScript

## React Native Components

## Hooks

## Model And Utility Code

## JSON Data

## Tests

## Naming

## UI Text

## Comments

## Refactor Targets
```

- [ ] **Step 2: Add TypeScript and JSON rules**

Include:

```markdown
- `strict` TypeScript MUST remain enabled.
- `any` is FORBIDDEN unless the reason is narrow and documented near the boundary.
- Domain types MUST be explicit and exported from the owning feature or neutral shared contract.
- JSON imports MUST be cast, normalized, or validated at the boundary before broad use.
- Optional fields MUST mean something specific; they MUST NOT be added for speculative future data.
```

- [ ] **Step 3: Add React Native and hooks rules**

Include:

```markdown
- Components MUST receive typed props.
- Components SHOULD stay focused on rendering one concept.
- Screen components MAY orchestrate sections but MUST NOT hide pure calculations inside render logic.
- `StyleSheet.create` SHOULD live at the bottom of component files.
- Hooks MUST manage state, side effects, or orchestration.
- Hooks MUST NOT return JSX.
- Hooks MUST NOT format complex view models when a pure mapper would be clearer.
```

- [ ] **Step 4: Add model, utility, and test rules**

Include:

```markdown
- Pure calculations MUST live in `model` or `utils`.
- Pure calculations MUST be testable without rendering React components.
- Tests MUST live near the feature in `__tests__`.
- Model and utility tests SHOULD assert edge cases and data boundaries.
- Screen and component tests SHOULD assert user-visible behavior.
```

- [ ] **Step 5: Add naming, UI text, and comments rules**

Include:

```markdown
- Components and exported types MUST use `PascalCase`.
- Functions, variables, hooks, and local values MUST use `camelCase`.
- Hook names MUST start with `use`.
- Game object ids, JSON filenames, and asset filenames MUST use `kebab-case`.
- Current Russian UI labels MAY remain inline in UI components.
- Domain ids MUST NOT be rendered directly as user-facing labels when dictionary data exists.
- Comments MUST explain non-obvious decisions, constraints, or platform behavior.
- Comments MUST NOT restate what the next line of code does.
```

- [ ] **Step 6: Verify required terms**

Run:

```bash
rg "MUST|SHOULD|FORBIDDEN|TypeScript|React Native|Tests|Naming" docs/guidelines/code-style.md
```

Expected: output includes each required term/section.

- [ ] **Step 7: Commit**

```bash
git add docs/guidelines/code-style.md
git commit -m "docs: add code style guidelines"
```

---

### Task 4: Create Project Pattern Rules

**Files:**
- Create: `docs/guidelines/project-patterns.md`

- [ ] **Step 1: Create project pattern sections**

Create `docs/guidelines/project-patterns.md` with these top-level sections:

```markdown
# Project Patterns

## Status

## Game Data Catalogs

## Hero Catalog And Builds

## Builder Draft Validation Export

## Asset Paths

## Divinity Calculators

## Admin Boundaries

## Tests And Integrity Checks

## Refactor Targets
```

- [ ] **Step 2: Add game data and hero rules**

Include:

```markdown
- Local JSON files in `src/features/game-data` MUST be the runtime source of truth for game catalogs.
- Runtime calls to external wiki or game-data URLs are FORBIDDEN.
- Catalog helpers MUST live near the catalog they serve.
- The master hero catalog and prepared hero builds MUST remain separate.
- User-facing build lists MUST use build-ready collections such as `heroesWithBuilds`.
- Hero and build lookup MUST use stable ids such as `heroId`.
```

- [ ] **Step 3: Add builder/export rules**

Include:

```markdown
- Builder features MUST separate draft state, validation, and export.
- Validation MUST be implemented as pure logic where practical.
- Exported JSON MUST include `schemaVersion`.
- Exported JSON MUST use stable ids instead of display labels as source-of-truth fields.
- Admin builder code MAY depend on game-data and admin-specific controls.
```

- [ ] **Step 4: Add asset and divinity rules**

Include:

```markdown
- Data files MUST store asset paths as `/img/...`.
- Runtime rendering MUST resolve local assets through `resolveAssetUri` or an approved shared replacement.
- Missing optional icons MUST render a controlled placeholder or omit the icon without crashing.
- Divinity calculation functions MUST be pure.
- Divinity storage MUST stay isolated from calculation and rendering.
- Divinity UI MUST render derived state and call explicit actions rather than mutate calculation data directly.
```

- [ ] **Step 5: Add admin boundary and refactor target rules**

Include:

```markdown
- User-facing features MUST NOT depend on admin components.
- User-facing features MUST NOT depend on admin-only types.
- Shared display helpers MUST move to `src/shared` when used by both admin and user-facing screens.
- Shared build contracts MUST move to a neutral owner before more features depend on them.
- Catalog relationship and asset reference integrity tests SHOULD be added or kept near game-data.
```

- [ ] **Step 6: Verify required terms**

Run:

```bash
rg "MUST|SHOULD|FORBIDDEN|Game Data|Hero|Builder|Asset|Divinity|Admin" docs/guidelines/project-patterns.md
```

Expected: output includes each required term/section.

- [ ] **Step 7: Commit**

```bash
git add docs/guidelines/project-patterns.md
git commit -m "docs: add project pattern guidelines"
```

---

### Task 5: Cross-Document Review And Final Verification

**Files:**
- Modify: `docs/guidelines/README.md` if links or wording need adjustment.
- Modify: `docs/guidelines/architecture.md` if cross-document terminology is inconsistent.
- Modify: `docs/guidelines/code-style.md` if cross-document terminology is inconsistent.
- Modify: `docs/guidelines/project-patterns.md` if cross-document terminology is inconsistent.

- [ ] **Step 1: Check all guideline files exist**

Run:

```bash
test -f docs/guidelines/README.md
test -f docs/guidelines/architecture.md
test -f docs/guidelines/code-style.md
test -f docs/guidelines/project-patterns.md
```

Expected: all commands exit with status `0`.

- [ ] **Step 2: Check links and references manually**

Run:

```bash
rg "architecture.md|code-style.md|project-patterns.md|Refactor Targets" docs/guidelines
```

Expected: `README.md` references all three files and each rule document includes `Refactor Targets` where required.

- [ ] **Step 3: Check normative language coverage**

Run:

```bash
rg "MUST|SHOULD|FORBIDDEN" docs/guidelines
```

Expected: each guideline file contains strict normative language.

- [ ] **Step 4: Check Markdown diff hygiene**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 5: Review changed files**

Run:

```bash
git diff -- docs/guidelines
```

Expected: documents match the design spec and do not introduce code changes.

- [ ] **Step 6: Final commit**

If Task 5 required edits after earlier commits:

```bash
git add docs/guidelines
git commit -m "docs: refine guidelines handbook"
```

If Task 5 required no edits, do not create an empty commit.

---

## Completion Criteria

- `docs/guidelines/README.md` exists and explains reading order, authority, and transition policy.
- `docs/guidelines/architecture.md` defines target directories, ownership, import boundaries, and refactor targets.
- `docs/guidelines/code-style.md` defines strict TypeScript, React Native, hooks, tests, naming, UI text, and comment rules.
- `docs/guidelines/project-patterns.md` defines project-specific catalog, hero build, builder, asset, divinity, admin, and integrity-test rules.
- `git diff --check` passes.
- The working tree contains only intentional guideline documentation changes before each commit.
