# Divinity APK Data And Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align divinity costs and visuals with the APK and add a typed, UI-free catalog for personalized divinity-gem chests.

**Architecture:** Keep the calculator's existing level JSON in `features/divinity`, add the reusable chest catalog to `features/game-data/divinity`, and keep runtime PNG assets behind stable `/img/...` paths resolved by `resolveAssetUri`. Production changes follow focused red-green cycles and do not alter the chest UI because no chest UI exists in this scope.

**Tech Stack:** Expo 56, React Native 0.85, TypeScript 6, Jest 29, Expo Router static web export.

## Global Constraints

- Do not add UI or calculations for chests.
- Do not include Faith or data from chests `600031` and `600077`.
- Preserve the public `GemIcon` props `level` and `size`.
- Use extracted APK PNG files and stable `/img/...` paths through `resolveAssetUri`.
- Do not make unrelated refactors.
- Do not commit or push any changes.
- Keep the already-open localhost calculator available for final visual verification.

## File Structure

- Modify `src/features/divinity/data/divinity-levels.json`: the three APK-backed level corrections only.
- Modify `src/features/divinity/__tests__/calculateDivinityTotals.test.ts`: exact transition, level-30, and full-total regressions.
- Modify `src/features/divinity/__tests__/divinityScreen.test.tsx`: update the two visible autofill assertions affected by the corrected level-1 transition.
- Create `src/features/game-data/divinity/divinity-gem-chests.json`: static contents of chests `600001` and `600076`.
- Modify `src/features/game-data/divinity/types.ts`: stable gem and chest catalog contracts.
- Modify `src/features/game-data/divinity/catalog.ts`: typed chest JSON boundary.
- Modify `src/features/game-data/divinity/index.ts`: public chest catalog export.
- Create `src/features/game-data/divinity/__tests__/divinityGemChests.test.ts`: exact catalog and chest-asset integrity tests.
- Replace internals of `src/features/divinity/ui/GemIcon.tsx`: PNG-backed React Native `Image` rendering.
- Create `src/features/divinity/__tests__/GemIcon.test.tsx`: all seven level-to-asset mappings, sizing, and file-existence coverage.
- Create `public/img/divinity/gems/gem-700361.png` through `gem-700367.png`: extracted game gem icons.
- Create `public/img/divinity/chests/chest-600001.png` and `chest-600076.png`: extracted game chest icons.

---

### Task 1: Correct APK-backed divinity costs

**Files:**
- Modify: `src/features/divinity/__tests__/calculateDivinityTotals.test.ts`
- Modify: `src/features/divinity/__tests__/divinityScreen.test.tsx`
- Modify: `src/features/divinity/data/divinity-levels.json`

**Interfaces:**
- Consumes: `calculateDivinityTotals(levels: DivinityLevel[], progress: DivinityProgress)`.
- Produces: corrected static `DivinityLevel[]` data with a six-segment level 30.

- [ ] **Step 1: Write the failing transition and full-total tests**

Update the first data assertion so the level-1 transition is paid with level-1
gems, add a level-2 transition assertion, replace the old level-30 assertion,
and add the full calculation regression:

```ts
test("divinity levels expose APK transition costs for levels 1 and 2", () => {
  expect(levels[0]).toMatchObject({
    level: 1,
    segmentCount: 3,
    transitionCost: {
      stone1: 2,
      stone2: 0,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
  });
  expect(levels[1]).toMatchObject({
    level: 2,
    segmentCount: 3,
    transitionCost: {
      stone1: 4,
      stone2: 0,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 0,
    },
  });
});

test("includes six APK segments at divinity level 30", () => {
  expect(levels[levels.length - 1]).toMatchObject({
    level: 30,
    segmentCount: 6,
    segmentCost: {
      stone1: 0,
      stone2: 0,
      stone3: 0,
      stone4: 0,
      stone5: 0,
      stone6: 0,
      stone7: 14,
    },
  });
});

test("calculates APK totals from level 1 through fully filled level 30", () => {
  expect(
    calculateDivinityTotals(levels, {
      startLevel: 1,
      endLevel: 30,
      currentLevel: 30,
      filledSegments: 6,
    }).totalCost,
  ).toEqual({
    stone1: 82,
    stone2: 96,
    stone3: 102,
    stone4: 114,
    stone5: 562,
    stone6: 398,
    stone7: 422,
  });
});
```

Update the two existing calculation expectations affected by moving the first
two transitions from `stone2` to `stone1`:

```ts
// Fully completed levels 1 and 2 before current level 3.
totalCost: {
  stone1: 15,
  stone2: 0,
  stone3: 0,
  stone4: 0,
  stone5: 0,
  stone6: 0,
  stone7: 0,
}
```

```ts
// Completed level 1 plus two filled segments of level 2.
totalCost: {
  stone1: 9,
  stone2: 0,
  stone3: 0,
  stone4: 0,
  stone5: 0,
  stone6: 0,
  stone7: 0,
}
```

In `divinityScreen.test.tsx`, change both `getByText("3")` cost assertions
inside `"autofill completes the selected range and disables manual circle
progress"` to `getByText("5")`. The range assertions for levels 1 and 2 stay
unchanged.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/calculateDivinityTotals.test.ts src/features/divinity/__tests__/divinityScreen.test.tsx
```

Expected: FAIL because transitions still use `stone2`, level 30 has zero
segments, and the old total is `76 / 102 / 102 / 114 / 562 / 398 / 338`.

- [ ] **Step 3: Apply the minimal JSON corrections**

Set these exact entries in `divinity-levels.json`:

```json
{
  "level": 1,
  "transitionCost": { "stone1": 2, "stone2": 0, "stone3": 0, "stone4": 0, "stone5": 0, "stone6": 0, "stone7": 0 }
}
```

```json
{
  "level": 2,
  "transitionCost": { "stone1": 4, "stone2": 0, "stone3": 0, "stone4": 0, "stone5": 0, "stone6": 0, "stone7": 0 }
}
```

```json
{
  "level": 30,
  "segmentCount": 6,
  "segmentCost": { "stone1": 0, "stone2": 0, "stone3": 0, "stone4": 0, "stone5": 0, "stone6": 0, "stone7": 14 },
  "transitionCost": { "stone1": 0, "stone2": 0, "stone3": 0, "stone4": 0, "stone5": 0, "stone6": 0, "stone7": 0 }
}
```

Preserve every non-target field and every other level verbatim.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same focused Jest command. Expected: both suites pass.

---

### Task 2: Add the personalized divinity-gem chest catalog

**Files:**
- Create: `src/features/game-data/divinity/__tests__/divinityGemChests.test.ts`
- Create: `src/features/game-data/divinity/divinity-gem-chests.json`
- Modify: `src/features/game-data/divinity/types.ts`
- Modify: `src/features/game-data/divinity/catalog.ts`
- Modify: `src/features/game-data/divinity/index.ts`
- Create: `public/img/divinity/chests/chest-600001.png`
- Create: `public/img/divinity/chests/chest-600076.png`

**Interfaces:**
- Produces: `divinityGemChests: DivinityGemChest[]` exported from `@/features/game-data/divinity`.
- Produces: `DivinityGemLevel`, `DivinityGemResourceId`, `DivinityGemChestId`, `DivinityGemChestContent`, and `DivinityGemChest` types.

- [ ] **Step 1: Write the failing catalog test without importing a missing symbol**

Create `divinityGemChests.test.ts`:

```ts
import * as fs from "node:fs";
import * as path from "node:path";

import * as divinityData from "..";

const expectedChests = [
  {
    id: "600001",
    name: "Персон. сундук с самоцветом божественности",
    icon: "/img/divinity/chests/chest-600001.png",
    contents: [
      { resourceId: 700361, gemLevel: 1, amount: 20 },
      { resourceId: 700362, gemLevel: 2, amount: 12 },
      { resourceId: 700363, gemLevel: 3, amount: 6 },
      { resourceId: 700364, gemLevel: 4, amount: 4 },
      { resourceId: 700365, gemLevel: 5, amount: 3 },
    ],
  },
  {
    id: "600076",
    name: "Большой персонализированный сундук с самоцветом божественности",
    icon: "/img/divinity/chests/chest-600076.png",
    contents: [
      { resourceId: 700361, gemLevel: 1, amount: 40 },
      { resourceId: 700362, gemLevel: 2, amount: 24 },
      { resourceId: 700363, gemLevel: 3, amount: 12 },
      { resourceId: 700364, gemLevel: 4, amount: 8 },
      { resourceId: 700365, gemLevel: 5, amount: 6 },
      { resourceId: 700366, gemLevel: 6, amount: 4 },
      { resourceId: 700367, gemLevel: 7, amount: 3 },
    ],
  },
];

const { divinityGemChests } = divinityData as typeof divinityData & {
  divinityGemChests?: unknown;
};

test("exposes the two gem-only personalized chests from the APK", () => {
  expect(divinityGemChests).toEqual(expectedChests);
});

test("references existing public chest icons", () => {
  expectedChests.forEach((chest) => {
    expect(chest.icon).toMatch(/^\/img\//);
    expect(
      fs.existsSync(path.join(process.cwd(), "public", chest.icon.slice(1))),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/game-data/divinity/__tests__/divinityGemChests.test.ts
```

Expected: FAIL because the catalog export is `undefined` and both chest PNGs
are absent.

- [ ] **Step 3: Add the explicit catalog types**

Append to `types.ts`:

```ts
export type DivinityGemLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DivinityGemResourceId =
  | 700361
  | 700362
  | 700363
  | 700364
  | 700365
  | 700366
  | 700367;

export type DivinityGemChestId = "600001" | "600076";

export type DivinityGemChestContent = {
  resourceId: DivinityGemResourceId;
  gemLevel: DivinityGemLevel;
  amount: number;
};

export type DivinityGemChest = {
  id: DivinityGemChestId;
  name: string;
  icon: string;
  contents: DivinityGemChestContent[];
};
```

- [ ] **Step 4: Add the exact JSON data and typed exports**

Create `divinity-gem-chests.json`:

```json
[
  {
    "id": "600001",
    "name": "Персон. сундук с самоцветом божественности",
    "icon": "/img/divinity/chests/chest-600001.png",
    "contents": [
      { "resourceId": 700361, "gemLevel": 1, "amount": 20 },
      { "resourceId": 700362, "gemLevel": 2, "amount": 12 },
      { "resourceId": 700363, "gemLevel": 3, "amount": 6 },
      { "resourceId": 700364, "gemLevel": 4, "amount": 4 },
      { "resourceId": 700365, "gemLevel": 5, "amount": 3 }
    ]
  },
  {
    "id": "600076",
    "name": "Большой персонализированный сундук с самоцветом божественности",
    "icon": "/img/divinity/chests/chest-600076.png",
    "contents": [
      { "resourceId": 700361, "gemLevel": 1, "amount": 40 },
      { "resourceId": 700362, "gemLevel": 2, "amount": 24 },
      { "resourceId": 700363, "gemLevel": 3, "amount": 12 },
      { "resourceId": 700364, "gemLevel": 4, "amount": 8 },
      { "resourceId": 700365, "gemLevel": 5, "amount": 6 },
      { "resourceId": 700366, "gemLevel": 6, "amount": 4 },
      { "resourceId": 700367, "gemLevel": 7, "amount": 3 }
    ]
  }
]
```

In `catalog.ts`, import the JSON and type, then add:

```ts
import gemChestsData from "./divinity-gem-chests.json";
import type { DivinityGemChest } from "./types";

export const divinityGemChests = gemChestsData as DivinityGemChest[];
```

Merge `DivinityGemChest` into the existing type import instead of creating a
duplicate import declaration. Add `divinityGemChests` to the named exports from
`./catalog` in `index.ts`.

- [ ] **Step 5: Copy only the two requested chest icons**

Create `public/img/divinity/chests` and copy only the supplied files:

```bash
mkdir -p public/img/divinity/chests
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Chest_600001.png public/img/divinity/chests/chest-600001.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Chest_600076.png public/img/divinity/chests/chest-600076.png
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run the focused Jest command again. Expected: both catalog and asset tests pass.

---

### Task 3: Replace synthetic gems with the seven game PNG icons

**Files:**
- Create: `src/features/divinity/__tests__/GemIcon.test.tsx`
- Modify: `src/features/divinity/ui/GemIcon.tsx`
- Create: `public/img/divinity/gems/gem-700361.png`
- Create: `public/img/divinity/gems/gem-700362.png`
- Create: `public/img/divinity/gems/gem-700363.png`
- Create: `public/img/divinity/gems/gem-700364.png`
- Create: `public/img/divinity/gems/gem-700365.png`
- Create: `public/img/divinity/gems/gem-700366.png`
- Create: `public/img/divinity/gems/gem-700367.png`

**Interfaces:**
- Consumes: `resolveAssetUri(path: string): string`.
- Preserves: `GemIcon({ level, size = 18 })` with levels 1 through 7.

- [ ] **Step 1: Write the failing component and asset test**

Create `GemIcon.test.tsx`:

```tsx
jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (assetPath: string) => `resolved:${assetPath}`,
}));

import * as fs from "node:fs";
import * as path from "node:path";

import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { GemIcon } from "../ui/GemIcon";

const gemCases = [
  [1, "/img/divinity/gems/gem-700361.png"],
  [2, "/img/divinity/gems/gem-700362.png"],
  [3, "/img/divinity/gems/gem-700363.png"],
  [4, "/img/divinity/gems/gem-700364.png"],
  [5, "/img/divinity/gems/gem-700365.png"],
  [6, "/img/divinity/gems/gem-700366.png"],
  [7, "/img/divinity/gems/gem-700367.png"],
] as const;

test.each(gemCases)("renders the level %s game icon", (level, iconPath) => {
  render(<GemIcon level={level} size={28} />);

  const icon = screen.getByLabelText(
    `Самоцвет божественности ${level} ур.`,
  );

  expect(icon.props.source).toEqual({ uri: `resolved:${iconPath}` });
  expect(icon.props.resizeMode).toBe("contain");
  expect(StyleSheet.flatten(icon.props.style)).toMatchObject({
    width: 28,
    height: 28,
  });
  expect(
    fs.existsSync(path.join(process.cwd(), "public", iconPath.slice(1))),
  ).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/GemIcon.test.tsx
```

Expected: FAIL because the existing component renders SVG polygons without the
PNG source/accessibility label and the public PNG files do not exist.

- [ ] **Step 3: Copy the seven requested gem icons**

Create `public/img/divinity/gems` and copy the supplied files:

```bash
mkdir -p public/img/divinity/gems
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700361.png public/img/divinity/gems/gem-700361.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700362.png public/img/divinity/gems/gem-700362.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700363.png public/img/divinity/gems/gem-700363.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700364.png public/img/divinity/gems/gem-700364.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700365.png public/img/divinity/gems/gem-700365.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700366.png public/img/divinity/gems/gem-700366.png
cp /Users/ext-markelov/.codex/visualizations/2026/07/18/019f776a-a11a-78c2-a491-6a7555b7abad/mythic-divinity-assets/Gem_700367.png public/img/divinity/gems/gem-700367.png
```

- [ ] **Step 4: Replace only the `GemIcon` internals**

Replace the SVG geometry with:

```tsx
import { Image } from "react-native";

import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

type GemIconProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  size?: number;
};

const iconPathByLevel: Record<GemIconProps["level"], string> = {
  1: "/img/divinity/gems/gem-700361.png",
  2: "/img/divinity/gems/gem-700362.png",
  3: "/img/divinity/gems/gem-700363.png",
  4: "/img/divinity/gems/gem-700364.png",
  5: "/img/divinity/gems/gem-700365.png",
  6: "/img/divinity/gems/gem-700366.png",
  7: "/img/divinity/gems/gem-700367.png",
};

export function GemIcon({ level, size = 18 }: GemIconProps) {
  return (
    <Image
      accessibilityLabel={`Самоцвет божественности ${level} ур.`}
      resizeMode="contain"
      source={{ uri: resolveAssetUri(iconPathByLevel[level]) }}
      style={{ width: size, height: size }}
    />
  );
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the focused Jest command again. Expected: all seven cases pass.

---

### Task 4: Verify the complete change on tests, build, localhost, and screen

**Files:**
- Verify only; do not commit generated build output.

**Interfaces:**
- Consumes: complete code and asset changes from Tasks 1 through 3.
- Produces: fresh evidence for tests, typechecking, web export, HTTP assets, and visual rendering.

- [ ] **Step 1: Run all functional tests**

Run:

```bash
npm test -- --runInBand
```

Expected: all Jest suites pass with zero failures.

- [ ] **Step 2: Run strict TypeScript checking**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0 and no TypeScript errors.

- [ ] **Step 3: Build the static Expo web output**

Run:

```bash
npm run export:web
```

Expected: exit code 0 and successful export of the web routes/assets.

- [ ] **Step 4: Verify all nine assets from localhost**

Request the seven gem URLs and two chest URLs under `http://localhost:8081`.
Every response must return HTTP 200 with `Content-Type: image/png`. Example:

```bash
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700361.png
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700362.png
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700363.png
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700364.png
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700365.png
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700366.png
curl -fsSI http://localhost:8081/img/divinity/gems/gem-700367.png
curl -fsSI http://localhost:8081/img/divinity/chests/chest-600001.png
curl -fsSI http://localhost:8081/img/divinity/chests/chest-600076.png
```

- [ ] **Step 5: Reload and inspect the already-open calculator**

Reload `http://localhost:8081/divinity` in the Codex in-app browser. Verify:

- seven PNG `<img>` elements appear in the resource summary;
- every image has a non-zero `naturalWidth` and `naturalHeight`;
- no gem image displays a broken-image indicator;
- all seven game icons are visually distinct and aligned without changing the
  calculator layout.

- [ ] **Step 6: Review the final diff and repository state**

Run:

```bash
git diff --check
git status --short
git diff -- src/features/divinity src/features/game-data/divinity public/img/divinity docs/superpowers
```

Expected: only the approved calculator data, tests, game-data catalog, nine
PNG assets, and the two uncommitted process documents are changed. There must
be no commit and no pushed branch.
