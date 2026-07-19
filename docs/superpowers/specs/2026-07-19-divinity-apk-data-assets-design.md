# Divinity APK Data And Assets Design

## Goal

Align the divinity calculator with the APK data, replace synthetic gem drawings
with the extracted game icons, and prepare a typed static catalog for the two
personalized divinity-gem chests without exposing chest UI or calculations.

## Scope

- Correct the `1 -> 2` and `2 -> 3` transition costs.
- Model level 30 as six segments costing 14 level-7 gems each.
- Make a fully filled `1 -> 30` calculation return gem totals
  `82 / 96 / 102 / 114 / 562 / 398 / 422` for levels 1 through 7.
- Render the extracted `Gem_700361` through `Gem_700367` PNG files through the
  existing `GemIcon` component API.
- Add typed static data and extracted icons for chests `600001` and `600076`.
- Add functional coverage for the corrected data, calculation, chest catalog,
  and runtime asset paths.

## Non-Goals

- No chest UI, chest calculator, inventory logic, or conversion logic.
- No Faith resources and no data from chests `600031` or `600077`.
- No unrelated refactoring, dependency changes, commits, or remote updates.

## Architecture

The existing divinity level table remains feature-owned at
`src/features/divinity/data/divinity-levels.json`, because it is the direct
runtime input of the current calculator and moving it would expand the change.
Only the three APK-backed corrections are applied to that table.

The reusable chest catalog belongs under `src/features/game-data/divinity`.
It consists of explicit TypeScript types, local static data, a typed catalog
export, and integrity tests. This follows the project rule that local read-only
game catalogs live in `features/game-data` and keeps the future consumer
independent from the current calculator UI.

## Divinity Level Semantics

The existing model remains unchanged:

- `segmentCount` and `segmentCost` represent APK `Phase 1...N` rows for a level.
- `transitionCost` represents APK `Phase 0` of the following level.
- A partial current level adds only filled segment costs.
- A completed level adds all segment costs and its transition cost.

The corrected rows are:

- level 1 transition: 2 level-1 gems;
- level 2 transition: 4 level-1 gems;
- level 30: 6 segments, each costing 14 level-7 gems, with no transition.

## Asset Layout And Rendering

Extracted assets are copied into stable kebab-case public paths:

- `public/img/divinity/gems/gem-700361.png` through
  `public/img/divinity/gems/gem-700367.png`;
- `public/img/divinity/chests/chest-600001.png`;
- `public/img/divinity/chests/chest-600076.png`.

`GemIcon` keeps its existing props:

```ts
type GemIconProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  size?: number;
};
```

Internally it maps each level to its `/img/divinity/gems/...` path, resolves
the path with `resolveAssetUri`, and renders a square React Native `Image` with
`resizeMode="contain"`. No caller changes are required.

## Chest Catalog Contract

Each chest has a stable id, Russian display name, icon path, and a list of
gem-only contents. Each content entry uses the stable APK gem resource id,
derived gem level, and amount.

```ts
type DivinityGemLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type DivinityGemChestContent = {
  resourceId: 700361 | 700362 | 700363 | 700364 | 700365 | 700366 | 700367;
  gemLevel: DivinityGemLevel;
  amount: number;
};

type DivinityGemChest = {
  id: "600001" | "600076";
  name: string;
  icon: string;
  contents: DivinityGemChestContent[];
};
```

Chest `600001` contains levels 1 through 5 in amounts `20, 12, 6, 4, 3`.
Chest `600076` contains levels 1 through 7 in amounts
`40, 24, 12, 8, 6, 4, 3`. No additional resources are represented.

## Testing And Verification

Implementation follows red-green TDD:

1. Update calculation/data tests first and confirm they fail against the old
   transition and level-30 values.
2. Add chest catalog integrity tests first and confirm they fail because the
   catalog does not yet exist.
3. Add asset-path/component tests first and confirm they fail while `GemIcon`
   still renders SVG geometry and the public files are absent.
4. Make the smallest production and asset changes needed for the tests to pass.

Final verification includes the focused tests, full Jest suite, TypeScript/web
export, direct localhost HTTP checks for all nine PNG paths, and a visual check
of the divinity screen in the already-open Codex in-app browser. The browser
check must confirm that seven real game icons render without broken images. The
exact fully-filled level-30 totals are verified through the pure calculation
test because the existing autofill behavior intentionally leaves the selected
end level empty.
