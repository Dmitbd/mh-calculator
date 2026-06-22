# Multi-Build Export Design

## Goal

Admin branch builder must let a user assemble every available hero build mode in one session and download one complete `HeroBuildSet` JSON.

## Non-Negotiable Constraint

Do not change the existing branch depth/progress validation.

The current single-build validation remains authoritative for each saved leaf build:

- branch progress minimum stays as implemented in `validateBranchBuild`;
- required major nodes stay as implemented in `validateBranchBuild`;
- branch/tree/template validation rules stay as implemented in `validateBranchBuild`.

The multi-build feature only applies that existing validation to every target leaf tab and reports tab-scoped errors.

## Current Behavior

The builder currently exports one `DivinityBranchBuilderExport`:

- `schemaVersion: 1`;
- one selected `targetTabPath`;
- one build payload;
- downloaded as `${heroId}.json`.

Committed hero build files use a different shape:

- `schemaVersion: 2`;
- `tabs`;
- nested leaf tabs contain `build`;
- committed nested builds do not store `targetTabPath`.

## Target Behavior

The builder stores one draft per build target leaf:

- `["pvp"]`;
- `["pve", "bosses"]`;
- `["pve", "campaign"]`.

The user workflow:

1. Select a target tab.
2. Fill the current build form.
3. Save the current tab draft.
4. Repeat for every target leaf tab.
5. Download one complete JSON only when every leaf tab has a valid saved build.

If any target leaf tab is missing or invalid, download is blocked and errors identify the tab:

- `PvP: Выберите руну.`
- `PvE -> Боссы: Выберите крупный навык для центральной колонки на уровне 1.`

## Export Contract

The downloaded JSON must be a `HeroBuildSet` compatible with user-facing build viewer data:

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
      "build": {}
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
          "build": {}
        },
        {
          "id": "campaign",
          "label": "Кампания",
          "order": 2,
          "kind": "build",
          "build": {}
        }
      ]
    }
  ]
}
```

Each nested `build` must be a committed build payload:

- includes `schemaVersion: 1`;
- includes `gameMode`;
- includes `heroId`;
- includes `heroName`;
- includes columns, major nodes, weapon awakening, equipment, progress, active nodes, metadata;
- does not include `targetTabPath`.

The tab location is the source of truth for target placement.

## Validation

Validation has two layers.

Single tab validation:

- reuse `validateBranchBuild`;
- do not change branch depth/progress behavior;
- do not change existing error messages except when prefixing them with a tab label in multi-build output.

Multi-build validation:

- every leaf tab in `buildTargetTabs` must have a saved draft;
- every saved draft must pass existing single-build validation;
- every saved build must match its target game mode;
- all saved builds must belong to the same selected hero;
- final `HeroBuildSet` must pass `validateHeroBuildTabs`;
- final nested builds must not contain `targetTabPath`.

## State Model

The hook should keep:

- current editable form state;
- current `targetTabPath`;
- saved builds keyed by normalized path, for example `pve/bosses`;
- selected hero as a global builder choice.

When the user switches target tabs, the current editable form may remain as-is until a saved draft is loaded or overwritten. The implementation may choose the least surprising behavior, but saved tab drafts must be explicit and test-covered.

Recommended behavior:

- selecting a tab with a saved draft loads that draft into the editable form;
- selecting a tab without a saved draft keeps the form empty for that tab;
- saving the current tab validates and stores only that tab.

## UI

Add two clear actions:

- save current tab draft;
- download full JSON.

The existing download action should become the full JSON download path. It must block until all target leaf tabs are valid.

Show saved/missing/invalid state per tab if feasible within the existing UI. At minimum, validation errors must identify the tab.

## Architecture

Add focused model helpers instead of expanding the screen:

- build target leaf traversal;
- path key and label helpers;
- convert saved tab builds into `HeroBuildSet`;
- validate all saved target builds.

The screen should stay as orchestration and UI composition. The hook owns editable state and saved draft state. Pure multi-build rules live in model/utils and have direct tests.

## Tests

Required tests:

- path helpers produce stable keys and labels;
- target leaf traversal returns `["pvp"]`, `["pve", "bosses"]`, `["pve", "campaign"]`;
- saving a valid current tab stores a committed build without `targetTabPath`;
- full export is blocked when any target tab is missing;
- full export prefixes validation errors with tab label;
- full export returns `schemaVersion: 2` with all leaf builds populated;
- branch depth/progress validation still fails exactly as before for incomplete progress;
- existing single-build validation tests remain green.

## Out Of Scope

- Importing an existing full JSON back into the builder.
- Multiple heroes in one export.
- Relaxed partial export.
- Changing branch depth/progress validation.
