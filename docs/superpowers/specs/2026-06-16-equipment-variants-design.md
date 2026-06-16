# Equipment Variants Specification

Date: 2026-06-16

## Goal

Allow one hero build to recommend several suitable weapon variants and several suitable rune variants.

The variants are independent from each other:

- weapons are a list of acceptable artifact options;
- runes are a separate list of acceptable rune options;
- there is no logical pairing such as "Axe must be used with Air Rune".

Example display:

- Weapons row: `Axe of Pangu` - `Staff of Sharur`
- Runes row: `Air Rune` - `Fire Rune` - `Thunder Rune`

The builder user can add as many variants as needed. The hero build viewer should show these as "appropriate options" and let the user inspect descriptions.

## Current Project Context

Current build equipment model:

```ts
export type EquipmentSelection = {
  artifactId: string | null;
  runeId: string | null;
};
```

Current build JSON stores:

```json
"equipment": {
  "artifactId": "axe-of-pangu",
  "runeId": "air"
}
```

Current UI:

- `EquipmentSelect` handles one selected artifact.
- `EquipmentSelect` handles one selected rune.
- The selected item description is shown immediately below the selector.
- `mapBuildToView` exposes one `artifactId` and one `runeId`.

Relevant files:

- `src/features/admin/components/EquipmentSelect.tsx`
- `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- `src/features/admin/types/admin.types.ts`
- `src/features/admin/utils/validateBranchBuild.ts`
- `src/features/heroes/screens/HeroBuildScreen.tsx`
- `src/features/heroes/utils/mapBuildToView.ts`
- `src/features/game-data/equipment/artifacts.json`
- `src/features/game-data/equipment/runes.json`
- hero build JSON files under `src/features/game-data/heroes/builds/`

## Data Model

Replace single equipment ids with variant arrays.

Recommended schema:

```ts
export type EquipmentVariantSelection = {
  artifactIds: string[];
  runeIds: string[];
};
```

Build JSON:

```json
"equipment": {
  "artifactIds": ["axe-of-pangu", "staff-of-sharur"],
  "runeIds": ["air", "fire", "thunder"]
}
```

Rules:

- `artifactIds` and `runeIds` are independent arrays.
- Order matters and should be preserved in UI.
- Duplicate ids are not allowed.
- A build must have at least one artifact and at least one rune unless product decides to allow incomplete drafts.
- Existing single-value builds should be migrated:
  - `artifactId: "axe-of-pangu"` -> `artifactIds: ["axe-of-pangu"]`
  - `runeId: "air"` -> `runeIds: ["air"]`

## Builder Requirements

The builder should let the user add multiple weapons and runes.

### Weapon Variants

Replace the single weapon selector with a variant row/list.

Behavior:

- Show selected weapons in one visual row when possible.
- Each selected weapon appears as a compact chip/card with icon and name.
- A `+` control adds another weapon variant.
- Tapping `+` opens the same available artifact catalog.
- Selected artifacts should not appear again as addable options, or selecting one should be ignored.
- Each selected weapon can be removed.
- If no weapon is selected, show an empty state with a `+` add action.

Example:

```text
Оружие
[ Axe of Pangu x ] [ Staff of Sharur x ] [ + ]
```

### Rune Variants

Same behavior as weapons, but using `runes.json`.

Example:

```text
Руны
[ Air Rune x ] [ Fire Rune x ] [ Thunder Rune x ] [ + ]
```

### Builder Form State

Replace:

```ts
selectedArtifactId: string | null;
selectedRuneId: string | null;
```

With:

```ts
selectedArtifactIds: string[];
selectedRuneIds: string[];
```

Expose actions:

```ts
addArtifact(id: string): void;
removeArtifact(id: string): void;
addRune(id: string): void;
removeRune(id: string): void;
```

Optional convenience:

```ts
setArtifactIds(ids: string[]): void;
setRuneIds(ids: string[]): void;
```

### Export

`buildExport()` should output the new array-based equipment shape.

The export must preserve the selected order.

## Hero Build Viewer Requirements

The read-only hero build screen should show recommended equipment variants clearly and compactly.

### Display Structure

Show two independent sections:

- `Оружие`
- `Руны`

Each section shows item tabs/chips in one row where possible.

Example:

```text
Оружие
[ Axe of Pangu ] [ Staff of Sharur ]
<description of selected weapon>

Руны
[ Air Rune ] [ Fire Rune ] [ Thunder Rune ]
<description of selected rune>
```

### Selection Behavior

The viewer can select one displayed weapon tab and one displayed rune tab independently.

Default selected item:

- first artifact in `artifactIds`;
- first rune in `runeIds`.

When the user taps a weapon tab:

- only the selected weapon description changes.
- rune selection is not affected.

When the user taps a rune tab:

- only the selected rune description changes.
- weapon selection is not affected.

This reinforces that the recommendations are independent.

### Descriptions

Weapon description:

- show `description` from `artifacts.json`.

Rune description:

- show `description` from `runes.json`.
- also show `elementalResonance` if present.

Do not show a dropdown in read-only hero view. This should feel like browsing recommended options, not editing.

## UI Components

Create a reusable component for variant rows instead of stretching `EquipmentSelect` too far.

Suggested builder component:

`src/features/admin/components/EquipmentVariantBuilder.tsx`

Responsibilities:

- render selected item chips;
- render `+` add action;
- render available catalog when adding;
- remove selected variants;
- keep layout responsive.

Suggested read-only component:

`src/features/heroes/components/EquipmentVariantTabs.tsx`

Responsibilities:

- render item tabs/chips;
- keep selected item state;
- show selected item description;
- support artifact and rune catalogs.

Alternative:

- create one shared `EquipmentVariantTabs` with `editable` mode.

Recommendation:

- Use two components if the editing UI becomes meaningfully different from the read-only UI.
- Use shared small subcomponents for chips if duplication grows.

## Visual Requirements

Builder:

- Use a clear `+` button for adding another item.
- Selected variants should look like compact chips/cards.
- Remove action should be visible but not visually dominant.
- Keep rows horizontally wrapping on small screens.
- Avoid nested cards.

Hero viewer:

- Use tab-like chips, not dropdowns.
- Active item should be visually clear.
- Description should appear directly below its item row.
- Weapon and rune sections must look independent.
- The UI should read as "recommended options", not "required combinations".

Suggested Russian labels:

- `Оружие`
- `Руны`
- `Добавить оружие`
- `Добавить руну`
- `Подходящие варианты оружия`
- `Подходящие варианты рун`

## Backward Compatibility And Migration

Since the project already has committed build JSON, migrate existing files.

For each build:

Before:

```json
"equipment": {
  "artifactId": "axe-of-pangu",
  "runeId": "air"
}
```

After:

```json
"equipment": {
  "artifactIds": ["axe-of-pangu"],
  "runeIds": ["air"]
}
```

Temporary compatibility is optional.

Recommendation:

- Migrate existing build files immediately.
- Add a small normalization helper only if tests need old fixtures.

If the build tabs schema v2 is implemented first, equipment variants should be applied inside each tab's `build.equipment`.

If equipment variants are implemented before build tabs schema v2, apply them to the current build object and then preserve them during the later tabs migration.

## Validation Requirements

Update validation logic.

Rules:

- `artifactIds` must be an array.
- `runeIds` must be an array.
- At least one artifact id is required for a valid export.
- At least one rune id is required for a valid export.
- Every artifact id must exist in `artifacts.json`.
- Every rune id must exist in `runes.json`.
- Duplicate artifact ids are invalid.
- Duplicate rune ids are invalid.

Suggested validation error codes:

- `equipment.artifactRequired`
- `equipment.artifactUnknown`
- `equipment.artifactDuplicate`
- `equipment.runeRequired`
- `equipment.runeUnknown`
- `equipment.runeDuplicate`

Existing single-value validation errors can be adapted to arrays.

## mapBuildToView Requirements

Update `BranchBuildViewModel`.

Before:

```ts
artifactId: string | null;
runeId: string | null;
```

After:

```ts
artifactIds: string[];
runeIds: string[];
```

The read-only screen should use arrays to render variant tabs.

## Tests

### Builder Hook Tests

Update `useDivinityBranchBuilder` tests:

- starts with empty `selectedArtifactIds` and `selectedRuneIds`;
- can add one artifact;
- can add several artifacts;
- can remove an artifact;
- does not add duplicates;
- can add and remove rune variants;
- export preserves selected order;
- export writes `equipment.artifactIds` and `equipment.runeIds`.

### Validation Tests

Update `validateBranchBuild` tests:

- accepts valid arrays;
- rejects empty artifact array;
- rejects empty rune array;
- rejects unknown artifact id;
- rejects unknown rune id;
- rejects duplicate artifact ids;
- rejects duplicate rune ids.

### View Mapping Tests

Update `mapBuildToView` tests:

- maps artifact arrays;
- maps rune arrays;
- preserves order.

### UI Tests

Builder UI:

- renders `+` add controls for weapons and runes;
- adding a weapon shows it in selected variants;
- removing a weapon removes it from selected variants;
- adding multiple runes shows multiple chips.

Hero view UI:

- renders all weapon variants;
- renders all rune variants;
- defaults to first weapon and first rune descriptions;
- tapping another weapon changes only weapon description;
- tapping another rune changes only rune description.

## Implementation Steps

1. Update equipment types from single ids to arrays.
2. Update builder hook state and actions.
3. Update validation for arrays, unknown ids, and duplicates.
4. Create builder equipment variant UI.
5. Create read-only equipment variant tabs UI.
6. Update `DivinityBranchBuilderScreen`.
7. Update `HeroBuildScreen`.
8. Update `mapBuildToView`.
9. Migrate existing build JSON.
10. Update tests and run the full suite.

## Out Of Scope

- Logical combinations of weapons and runes.
- Ranking variants as primary/secondary.
- Per-variant notes.
- Per-tab equipment inheritance.
- Auto-generating recommendations.
- Changing artifact or rune catalog data.

These can be added later if product needs them.

## Acceptance Criteria

The task is complete when:

- A build can store multiple artifact ids and multiple rune ids.
- The builder can add and remove multiple weapon variants.
- The builder can add and remove multiple rune variants.
- Exported JSON contains `artifactIds` and `runeIds`.
- The hero build screen displays weapon variants as selectable tabs/chips.
- The hero build screen displays rune variants as selectable tabs/chips.
- Selecting a weapon changes only the weapon description.
- Selecting a rune changes only the rune description.
- Weapons and runes are not paired or logically linked.
- Existing Bastet build data is migrated.
- Tests cover builder state, validation, mapping, and UI behavior.
- Full `npm test -- --runInBand` passes.

## Estimate

Assuming the current codebase remains close to the inspected state, expected effort is 1.5-2.5 working days.

Breakdown:

- Data model and migration: 2-3 hours.
- Builder hook and validation updates: 3-5 hours.
- Builder UI for adding/removing variants: 4-6 hours.
- Read-only hero view tabs and descriptions: 3-5 hours.
- Tests and fixture updates: 4-6 hours.
- Polish and responsive checks: 2-3 hours.

Risk factors:

- If this is implemented after the scalable build-tabs schema, the work is cleaner but touches nested build data.
- If implemented before build-tabs schema, a later migration must preserve the new equipment arrays.
- UI polish on mobile may need extra iteration if selected variants wrap poorly.

Recommended sequencing:

1. Implement build tabs schema first.
2. Then implement equipment variants inside each selected build tab.

This avoids migrating build JSON twice.
