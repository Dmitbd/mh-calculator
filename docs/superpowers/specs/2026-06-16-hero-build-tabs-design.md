# Hero Build Tabs Specification

Date: 2026-06-16

## Goal

Replace the current fixed `pvp` / `pve` build selection with a scalable tab model that supports nested build categories.

The first required structure is:

- `PvP`
- `PvE`
  - `Боссы`
  - `Кампания`

The UI should look like folder tabs so the user clearly understands that each tab opens a separate build context.

This logic must apply to:

- the admin hero build builder;
- the read-only hero build screen;
- hero build data files.

## Current Project Context

Current build data is shaped like:

```json
{
  "pve": null,
  "pvp": {
    "schemaVersion": 1,
    "gameMode": "pvp"
  }
}
```

Current limitations:

- `PvE` can store only one build.
- It cannot distinguish `Боссы` from `Кампания`.
- Adding future categories would require another schema change.
- `GameModeRadio` visually behaves like a radio selector, not like folder tabs.

Relevant files:

- `src/features/game-data/heroes/builds/bastet.json`
- `src/features/game-data/heroes/heroBuilds.ts`
- `src/features/heroes/types/heroes.types.ts`
- `src/features/heroes/screens/HeroBuildScreen.tsx`
- `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- `src/features/admin/components/GameModeRadio.tsx`
- `src/features/admin/types/admin.types.ts`

## Design Direction

Use a generic tree of build tabs instead of hardcoding `pve.bosses` and `pve.campaign`.

This is more scalable because future build contexts can be added without changing the TypeScript shape again.

Examples of future additions:

- `PvP -> Arena`
- `PvP -> Guild War`
- `PvE -> Guild Boss`
- `PvE -> Pantheon`
- `PvE -> Tower`
- a seasonal event tab

## Data Model

Introduce hero build set schema version 2.

```ts
export type HeroBuildSet = {
  schemaVersion: 2;
  tabs: HeroBuildTab[];
};

export type HeroBuildTab = {
  id: string;
  label: string;
  order: number;
  kind: "build" | "group";
  gameMode?: DivinityGameMode;
  build: DivinityBranchBuildExport | null;
  children?: HeroBuildTab[];
};
```

Field rules:

- `id`: stable slug inside the current tab level.
- `label`: UI label.
- `order`: sort order inside the current level.
- `kind: "build"`: this tab can directly contain a build.
- `kind: "group"`: this tab is a parent for child tabs.
- `gameMode`: optional mode hint for this tab branch. Use this to map generic tabs back to the existing build `gameMode`.
- `build`: `DivinityBranchBuildExport` when the tab has a ready build, otherwise `null`.
- `children`: only used for grouped tabs.

Recommended invariant:

- `kind: "group"` should have `build: null` and at least one child.
- `kind: "build"` should not have children.
- `gameMode` should be set on top-level mode tabs such as `pvp` and `pve`.
- Child tabs inherit `gameMode` from the nearest parent unless they explicitly override it.
- A tab with a ready `build` must have a resolvable `gameMode`, and the nested `build.gameMode` must match it.

## Example Data

`src/features/game-data/heroes/builds/bastet.json`

```json
{
  "schemaVersion": 2,
  "tabs": [
    {
      "id": "pvp",
      "label": "PvP",
      "order": 1,
      "kind": "build",
      "gameMode": "pvp",
      "build": {
        "schemaVersion": 1,
        "gameMode": "pvp",
        "heroName": "Бастет"
      }
    },
    {
      "id": "pve",
      "label": "PvE",
      "order": 2,
      "kind": "group",
      "gameMode": "pve",
      "build": null,
      "children": [
        {
          "id": "bosses",
          "label": "Боссы",
          "order": 1,
          "kind": "build",
          "build": null
        },
        {
          "id": "campaign",
          "label": "Кампания",
          "order": 2,
          "kind": "build",
          "build": null
        }
      ]
    }
  ]
}
```

The full existing Bastet PvP build should be moved into the `pvp` tab `build` field.

## Shared Tab Utilities

Create utilities for working with build tabs.

Suggested file:

`src/features/heroes/utils/heroBuildTabs.ts`

Required helpers:

- `sortBuildTabs(tabs)`
- `findFirstReadyBuildTab(tabs)`
- `hasReadyBuildInTabs(tabs)`
- `getTabByPath(tabs, path)`
- `getFirstSelectablePath(tabs)`
- `getBuildAtPath(tabs, path)`
- `getGameModeForPath(tabs, path)`

Path format:

```ts
type HeroBuildTabPath = string[];
```

Examples:

- `["pvp"]`
- `["pve", "bosses"]`
- `["pve", "campaign"]`

`heroesWithBuilds` should use `hasReadyBuildInTabs`, not fixed `pvp/pve` checks.

## Builder Requirements

The admin builder must let the user choose where the exported build belongs.

Current selector:

- `PvP`
- `PvE`

New selector:

- top row folder tabs:
  - `PvP`
  - `PvE`
- if `PvE` is selected, show sub-tabs:
  - `Боссы`
  - `Кампания`

The selected destination should be represented internally as:

```ts
targetTabPath: string[];
```

Examples:

- PvP: `["pvp"]`
- PvE bosses: `["pve", "bosses"]`
- PvE campaign: `["pve", "campaign"]`

The existing build export should remain compatible with the current build payload, but include target metadata.

Recommended export addition:

```json
"targetTabPath": ["pve", "bosses"]
```

This lets the exported JSON clearly say where it should be placed in the hero build set.

Existing `gameMode` should continue to be:

- `"pvp"` for `["pvp"]`
- `"pve"` for all PvE child tabs

Do not encode `bosses` or `campaign` into `gameMode`.

For future nested tabs, derive `gameMode` from the selected tab path using the tab tree:

- read `gameMode` from the selected tab;
- if missing, walk upward to the nearest parent with `gameMode`;
- fail validation if no `gameMode` can be resolved.

### Builder Export Vs Committed Build Data

`targetTabPath` is builder-export metadata. It tells a human or future import tool where the exported build should be placed.

Committed hero build files should still use the tab tree as the source of truth:

```json
{
  "schemaVersion": 2,
  "tabs": [
    {
      "id": "pve",
      "children": [
        {
          "id": "bosses",
          "build": { "...": "..." }
        }
      ]
    }
  ]
}
```

Do not rely on `build.targetTabPath` inside committed hero build files. The outer tab location already defines the build location.

## Hero Build Screen Requirements

The read-only hero screen must render tabs from the hero build data.

Behavior:

1. Load `HeroBuildSet.schemaVersion === 2`.
2. Sort top-level tabs by `order`.
3. Select the first tab path with a ready build by default.
4. If no ready build exists, select the first available tab path and show an empty state.
5. Render top-level tabs.
6. If the active top-level tab has children, render child tabs below it.
7. Render the selected build if present.
8. Show the existing placeholder when the selected tab has no build.

Important:

- A hero should appear in the hero list only if at least one tab anywhere in the tree has a ready build.
- Empty tabs can still be visible on the hero detail screen, so users understand planned categories.

## Folder Tab UI

Create a reusable component instead of continuing to use `GameModeRadio`.

Suggested component:

`src/shared/ui/BuildFolderTabs.tsx`

Reason:

- the folder tabs are needed by both admin builder screens and read-only hero screens;
- placing the component under `features/heroes` would make admin code depend on the heroes feature;
- `shared/ui` keeps the dependency direction clean.

It should support:

- readonly visual tab rendering;
- selected tab state;
- press handling;
- compact layout on mobile;
- a second row for child tabs.

Visual requirements:

- Tabs should look like folder labels.
- Active tab should visually connect to the content below.
- Inactive tabs should look slightly recessed.
- Use restrained colors that match the existing brown/gold UI.
- Do not use radio circles for this interaction.
- Text must fit on mobile.

Suggested labels:

- `PvP`
- `PvE`
- `Боссы`
- `Кампания`

Suggested accessibility labels:

- `Select PvP build tab`
- `Select PvE build tab`
- `Select Боссы build tab`
- `Select Кампания build tab`

## Backward Compatibility

The implementation can choose one of two options:

1. Support both old and new schemas temporarily.
2. Migrate all existing build files to schema v2 immediately.

Recommended:

- Migrate existing build files to schema v2 immediately.
- Keep a small normalization helper only if tests or fixtures still need old schema support.

Since the project currently has only Bastet, immediate migration is simpler and cleaner.

## Type Changes

Update `src/features/heroes/types/heroes.types.ts`.

Replace the current fixed `Record<DivinityGameMode, DivinityBranchBuildExport | null>` build set with schema v2 tab types.

Add:

```ts
export type HeroBuildTabKind = "build" | "group";

export type HeroBuildTabPath = string[];

export type HeroBuildTab = {
  id: string;
  label: string;
  order: number;
  kind: HeroBuildTabKind;
  gameMode?: DivinityGameMode;
  build: DivinityBranchBuildExport | null;
  children?: HeroBuildTab[];
};

export type HeroBuildSet = {
  schemaVersion: 2;
  tabs: HeroBuildTab[];
};
```

Admin export types should include:

```ts
export type HeroBuildTargetTabPath = string[];
```

Use a dedicated builder export type when possible:

```ts
export type DivinityBranchBuilderExport = DivinityBranchBuildExport & {
  targetTabPath: HeroBuildTargetTabPath;
};
```

If a dedicated type is too invasive, `DivinityBranchBuildExport` may temporarily include:

```ts
targetTabPath?: HeroBuildTargetTabPath;
```

Prefer the dedicated builder export type because committed build data should not need `targetTabPath`.

## Validation Requirements

Add validation for build tabs.

Rules:

- `HeroBuildSet.schemaVersion` must be `2`.
- Top-level `tabs` must be a non-empty array.
- `id` must be unique among sibling tabs at every depth.
- `order` must be numeric.
- `kind` must be `build` or `group`.
- `group` tabs must have children.
- `build` tabs must not have children.
- `group` tabs must not directly contain a build.
- validation should recurse through all nested tabs.
- tab depth should be unlimited by the data model, but the UI only needs to render two levels for this task.
- every ready build must have a resolvable `gameMode`.
- every ready build's `build.gameMode` must match the resolved tab `gameMode`.
- A tab path lookup should fail gracefully when path does not exist.
- At least one ready build is required for a hero to appear in `heroesWithBuilds`.

## Tests

Add or update tests.

### Data Tests

Update hero catalog/build integrity tests:

- Bastet build file uses `schemaVersion: 2`.
- Build tabs have valid ids, labels, order, kind, and structure.
- `hasReadyBuildInTabs` returns true for Bastet.
- A build set with only empty tabs returns false.
- `heroesWithBuilds` includes only heroes with at least one ready nested build.

### Utility Tests

Add tests for `heroBuildTabs` helpers:

- Finds first ready top-level build.
- Finds first ready nested build.
- Returns `null` when no ready build exists.
- Resolves `["pvp"]`.
- Resolves `["pve", "bosses"]`.
- Keeps tab order stable.
- Resolves inherited `gameMode` for nested tabs.
- Detects mismatched tab `gameMode` and nested build `gameMode` in validation.
- Handles missing paths without throwing.

### Builder Tests

Update builder tests:

- Default target tab path is sensible, probably `["pve", "bosses"]` or `["pvp"]`; choose one and document it.
- Selecting `PvP` sets target path `["pvp"]`.
- Selecting `PvE -> Боссы` sets target path `["pve", "bosses"]`.
- Selecting `PvE -> Кампания` sets target path `["pve", "campaign"]`.
- Export includes `targetTabPath`.
- Existing `gameMode` remains `"pvp"` or `"pve"`.

### Hero Screen Tests

Update `HeroBuildScreen` tests:

- Renders top-level folder tabs.
- Renders PvE child tabs when PvE is active.
- Defaults to the first ready build path.
- Keeps child selection stable when switching between top-level tabs and back, if practical.
- Shows placeholder for an empty selected tab.
- Renders the selected build content after switching tabs.

## Migration Steps

1. Add tab types.
2. Add tab utility functions.
3. Convert `bastet.json` to schema v2.
4. Update `heroBuilds.ts` to use nested ready-build detection.
5. Replace `GameModeRadio` usage on `HeroBuildScreen` with folder tabs.
6. Add target tab selection to the admin builder.
7. Add `targetTabPath` to builder export.
8. Update tests.
9. Run full test suite.

## Out Of Scope

- Creating actual PvE Bosses or Campaign builds now.
- Adding a separate UI for editing committed hero build files directly.
- Auto-inserting exported builder JSON into `builds/{heroId}.json`.
- Changing branch grid, equipment, rune, or weapon awakening logic.
- Redesigning the whole hero detail screen outside the tab area.

## Acceptance Criteria

The task is complete when:

- Hero build files use schema v2 tab trees.
- Bastet PvP build is available under the `PvP` folder tab.
- PvE contains `Боссы` and `Кампания` child tabs.
- The hero detail screen displays folder-style tabs.
- Selecting tabs changes the displayed build or empty state.
- The admin builder lets the user choose the target tab path.
- Builder export includes the selected target tab path.
- Committed hero build files use tab position as the source of truth and do not require `targetTabPath` inside nested builds.
- Nested build `gameMode` values match the resolved tab mode.
- `heroesWithBuilds` works with nested tabs.
- Tests cover tab utilities, data integrity, builder target selection, and hero screen tab rendering.
- Full `npm test -- --runInBand` passes.
