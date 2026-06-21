# Architecture Quality Followups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the next architecture-quality layer after the main migration: explicit public APIs, consistent presentation folders, a thinner hero build screen, stronger integrity checks, and safer catalog boundaries.

**Architecture:** Keep the current feature-based structure. Do not introduce heavy clean architecture layers. Add public entrypoints only where they reduce unsafe deep imports, move screen orchestration into focused sections/model helpers, and protect decisions with boundary/integrity tests.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Native Testing Library, local JSON catalogs.

---

## Execution Rules

- Work task-by-task in order.
- Use TDD for every code change: write the failing test, run it, implement, rerun.
- Commit after each task.
- Do not change product behavior unless a test/spec explicitly requires it.
- Run `npx tsc --noEmit`, `npm test -- --runInBand`, and `git diff --check` before the final push.

## Target File Structure

- Create/update public APIs:
  - `src/features/builds/index.ts`
  - `src/features/builds/components/index.ts`
  - `src/features/builds/types/index.ts`
  - `src/features/game-data/index.ts`
  - `src/features/game-data/divinity/index.ts`
  - `src/features/game-data/equipment/index.ts`
  - `src/features/game-data/heroes/index.ts`
  - `src/features/game-data/weapon-awakening/index.ts`
  - Optional only if useful: `src/features/heroes/index.ts`, `src/features/divinity/index.ts`, `src/features/admin/index.ts`
- Move/standardize presentation folders only where the win is obvious:
  - Keep `src/features/builds/components`
  - Keep `src/features/heroes/components`
  - Keep `src/features/admin/components`
  - Decide whether `src/features/divinity/ui` remains documented exception or gets renamed to `components`
- Split hero build screen:
  - Create `src/features/heroes/components/hero-build/HeroBuildTabsSection.tsx`
  - Create `src/features/heroes/components/hero-build/HeroBuildEquipmentSection.tsx`
  - Create `src/features/heroes/components/hero-build/HeroBuildWeaponAwakeningSection.tsx`
  - Create `src/features/heroes/components/hero-build/HeroBuildBranchSection.tsx`
  - Create `src/features/heroes/model/heroBuildTabs.ts`
  - Modify `src/features/heroes/screens/HeroBuildScreen.tsx`
- Strengthen catalog checks:
  - Modify `src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts`
  - Create `src/features/game-data/equipment/__tests__/equipmentCatalogDataIntegrity.test.ts`
  - Create `src/features/game-data/divinity/__tests__/divinityCatalogDataIntegrity.test.ts`
  - Create `src/features/game-data/__tests__/assetPathsDataIntegrity.test.ts`
- Optional runtime normalization:
  - Create `src/features/game-data/catalogValidation.ts`
  - Add focused tests only if runtime guards are introduced.
- Docs:
  - Modify `docs/guidelines/architecture.md`
  - Modify `docs/guidelines/project-patterns.md`
  - Modify `docs/guidelines/code-style.md`

---

### Task 1: Explicit Public APIs

**Purpose:** Reduce fragile deep imports by adding documented public entrypoints for reused feature modules.

**Files:**
- Create: `src/features/builds/index.ts`
- Create: `src/features/builds/components/index.ts`
- Create: `src/features/builds/types/index.ts`
- Create: `src/features/game-data/index.ts`
- Create: `src/features/game-data/divinity/index.ts`
- Create: `src/features/game-data/equipment/index.ts`
- Create: `src/features/game-data/heroes/index.ts`
- Create: `src/features/game-data/weapon-awakening/index.ts`
- Modify: imports in `src/features/admin/**`, `src/features/heroes/**`, tests where public API improves clarity
- Test: `src/features/__tests__/architectureBoundaries.test.js`

- [ ] **Step 1: Write failing boundary test**

Add a test to `src/features/__tests__/architectureBoundaries.test.js`:

```js
test("features consume builds through public entrypoints", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/features"))
    .filter((filePath) => !filePath.includes(`${path.sep}builds${path.sep}`))
    .filter((filePath) =>
      /@\/features\/builds\/(components|types)\//.test(read(filePath)),
    )
    .map(relative);

  expect(offenders).toEqual([]);
});
```

Expected current RED:
- Fails on imports such as `@/features/builds/components/BranchBuilderGrid`.

- [ ] **Step 2: Run RED test**

Run:

```bash
npm test -- --runInBand src/features/__tests__/architectureBoundaries.test.js
```

Expected:
- FAIL because build components/types are imported through deep paths outside `features/builds`.

- [ ] **Step 3: Add builds public API**

Create `src/features/builds/components/index.ts`:

```ts
export { BranchBuilderGrid } from "./BranchBuilderGrid";
export { BuildFolderTabs } from "./BuildFolderTabs";
export { EquipmentVariantTabs } from "./EquipmentVariantTabs";
export { WeaponAwakeningBonusList } from "./WeaponAwakeningBonusList";
export { WeaponAwakeningPicker } from "./WeaponAwakeningPicker";
```

Create `src/features/builds/types/index.ts`:

```ts
export type { BuildFolderTabItem } from "./buildTabs";
```

Create `src/features/builds/index.ts`:

```ts
export {
  BranchBuilderGrid,
  BuildFolderTabs,
  EquipmentVariantTabs,
  WeaponAwakeningBonusList,
  WeaponAwakeningPicker,
} from "./components";
export type { BuildFolderTabItem } from "./types";
```

- [ ] **Step 4: Update builds imports**

Replace outside-builds imports:

```ts
import { BranchBuilderGrid } from "@/features/builds";
import { BuildFolderTabs } from "@/features/builds";
import { EquipmentVariantTabs } from "@/features/builds";
import { WeaponAwakeningBonusList } from "@/features/builds";
import { WeaponAwakeningPicker } from "@/features/builds";
import type { BuildFolderTabItem } from "@/features/builds";
```

Touch likely files:
- `src/features/admin/components/branch-builder/BranchGridSection.tsx`
- `src/features/admin/components/branch-builder/BuildTargetSection.tsx`
- `src/features/admin/components/branch-builder/WeaponAwakeningSection.tsx`
- `src/features/admin/model/branchBuilderTabs.ts`
- `src/features/heroes/screens/HeroBuildScreen.tsx`

- [ ] **Step 5: Add game-data public APIs**

Create `src/features/game-data/divinity/index.ts`:

```ts
export { divinityBranches, divinitySkills, divinityTreeTemplate } from "./catalog";
export { deriveSkillLevel } from "./deriveSkillLevel";
export { filterSkillsForSlot } from "./filterSkillsForSlot";
export type * from "./types";
```

Create `src/features/game-data/equipment/index.ts`:

```ts
export { equipmentArtifacts, equipmentRunes } from "./catalog";
export type * from "./types";
```

Create `src/features/game-data/heroes/index.ts`:

```ts
export {
  getHeroBuildSet,
  getHeroById,
  heroes,
  heroesWithBuilds,
} from "./heroBuilds";
export {
  filterTabsWithReadyBuilds,
  getBuildAtPath,
  getDefaultTabPath,
  getDefaultTabPathFromTabs,
  getGameModeForPath,
  getTabByPath,
  hasReadyBuildInTabs,
  sortBuildTabs,
  validateHeroBuildTabs,
} from "./heroBuildTabs";
export {
  getDictionaryEntry,
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
} from "./heroDictionaries";
export type * from "./types";
```

Create `src/features/game-data/weapon-awakening/index.ts`:

```ts
export {
  weaponAwakeningColors,
  weaponAwakeningCombos,
  weaponAwakeningSlots,
} from "./catalog";
export {
  resolveWeaponAwakeningBonuses,
  toWeaponAwakeningSelections,
} from "./resolveWeaponAwakeningBonuses";
export {
  getIconicWeaponHeroClass,
  getWeaponAwakeningActiveBonuses,
} from "./weaponAwakeningBonuses";
export type * from "./types";
```

Create `src/features/game-data/index.ts`:

```ts
export * as divinityGameData from "./divinity";
export * as equipmentGameData from "./equipment";
export * as heroesGameData from "./heroes";
export * as weaponAwakeningGameData from "./weapon-awakening";
```

- [ ] **Step 6: Update imports opportunistically**

Only update imports where it improves boundary clarity. Do not churn every test import.

High-value files:
- `src/features/admin/data/branchBuilderCatalogs.ts`
- `src/features/admin/data/buildTargetTabs.ts`
- `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- `src/features/admin/model/branchBuilderTabs.ts`
- `src/features/heroes/screens/HeroBuildScreen.tsx`
- `src/features/heroes/screens/HeroSelectScreen.tsx`
- `src/features/builds/components/BranchBuilderGrid.tsx`

- [ ] **Step 7: Verify Task 1**

Run:

```bash
npm test -- --runInBand src/features/__tests__/architectureBoundaries.test.js
npx tsc --noEmit
```

Expected:
- PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/features
git commit -m "refactor: add feature public entrypoints"
```

---

### Task 2: Presentation Folder Rule

**Purpose:** Make `ui` vs `components` explicit and prevent future ambiguity.

**Files:**
- Modify: `docs/guidelines/architecture.md`
- Modify: `docs/guidelines/project-patterns.md`
- Modify: `src/features/__tests__/architectureBoundaries.test.js`
- Optional Modify/Rename: `src/features/divinity/ui/*`

- [ ] **Step 1: Decide the rule**

Use this rule unless there is a strong reason not to:

- `components` = feature or cross-feature React components.
- `ui` = allowed legacy folder only in `src/features/divinity/ui` until a dedicated rename task is scheduled.
- New feature UI folders MUST use `components`.

- [ ] **Step 2: Write boundary/doc test**

Add to `src/features/__tests__/architectureBoundaries.test.js`:

```js
test("new feature presentation folders use components unless explicitly allowed", () => {
  const allowedUiFolders = new Set(["src/features/divinity/ui"]);
  const featureDirs = fs
    .readdirSync(path.join(repoRoot, "src/features"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(repoRoot, "src/features", entry.name));

  const offenders = featureDirs
    .map((featureDir) => path.join(featureDir, "ui"))
    .filter((uiDir) => fs.existsSync(uiDir))
    .map(relative)
    .filter((uiDir) => !allowedUiFolders.has(uiDir));

  expect(offenders).toEqual([]);
});
```

Expected:
- PASS with only `src/features/divinity/ui` allowed.

- [ ] **Step 3: Update docs**

Update `docs/guidelines/architecture.md`:

```md
- New feature presentation folders SHOULD be named `components`.
- Existing `src/features/divinity/ui` is an allowed legacy exception until a dedicated rename is scheduled.
```

Update `docs/guidelines/project-patterns.md`:

```md
- `src/features/divinity/ui` is currently an allowed local convention for divinity presentation components.
- Do not introduce new `ui` folders without updating architecture guidelines and boundary tests.
```

- [ ] **Step 4: Optional rename**

Only do this if the team wants zero exceptions:

Rename:
- `src/features/divinity/ui` -> `src/features/divinity/components`

Update imports in:
- `src/features/divinity/screens/DivinityScreen.tsx`
- any divinity tests that import UI directly

If choosing this optional rename, write a RED boundary test first expecting no `src/features/*/ui` folders.

- [ ] **Step 5: Verify Task 2**

Run:

```bash
npm test -- --runInBand src/features/__tests__/architectureBoundaries.test.js src/features/divinity/__tests__/divinityScreen.test.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit Task 2**

```bash
git add docs/guidelines src/features
git commit -m "docs: define presentation folder convention"
```

---

### Task 3: Split HeroBuildScreen

**Purpose:** Make `HeroBuildScreen` match the admin builder pattern: screen orchestrates state, sections render focused UI.

**Files:**
- Create: `src/features/heroes/components/hero-build/HeroBuildTabsSection.tsx`
- Create: `src/features/heroes/components/hero-build/HeroBuildEquipmentSection.tsx`
- Create: `src/features/heroes/components/hero-build/HeroBuildWeaponAwakeningSection.tsx`
- Create: `src/features/heroes/components/hero-build/HeroBuildBranchSection.tsx`
- Create: `src/features/heroes/model/heroBuildTabs.ts`
- Modify: `src/features/heroes/screens/HeroBuildScreen.tsx`
- Test: `src/features/heroes/__tests__/HeroBuildScreen.test.tsx`
- Test: create `src/features/heroes/__tests__/heroBuildTabsModel.test.ts`
- Boundary Test: `src/features/admin/__tests__/heroFeatureBoundaries.test.js` or `src/features/__tests__/architectureBoundaries.test.js`

- [ ] **Step 1: Write structural RED test**

Add to a boundary test:

```js
test("hero build screen is composed from focused sections", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/features/heroes/screens/HeroBuildScreen.tsx"),
    "utf8",
  );
  const requiredSections = [
    "HeroBuildTabsSection",
    "HeroBuildEquipmentSection",
    "HeroBuildWeaponAwakeningSection",
    "HeroBuildBranchSection",
  ];

  expect(requiredSections.filter((name) => !source.includes(name))).toEqual([]);
});
```

Expected RED:
- FAIL because these sections do not exist in the screen yet.

- [ ] **Step 2: Write model RED test**

Create `src/features/heroes/__tests__/heroBuildTabsModel.test.ts`:

```ts
import { getHeroBuildTabViewModel } from "../model/heroBuildTabs";
import type { HeroBuildTab } from "@/features/game-data/heroes";

const tabs: HeroBuildTab[] = [
  { id: "pvp", label: "PvP", order: 2, kind: "build", build: null },
  {
    id: "pve",
    label: "PvE",
    order: 1,
    kind: "group",
    build: null,
    children: [
      { id: "bosses", label: "Боссы", order: 1, kind: "build", build: null },
    ],
  },
];

test("derives folder tabs for active hero build path", () => {
  const model = getHeroBuildTabViewModel(tabs, ["pve", "bosses"]);

  expect(model.activeTopId).toBe("pve");
  expect(model.activeChildId).toBe("bosses");
  expect(model.topFolderTabs.map((tab) => tab.id)).toEqual(["pve", "pvp"]);
  expect(model.childFolderTabs.map((tab) => tab.id)).toEqual(["bosses"]);
});
```

Expected RED:
- FAIL because `../model/heroBuildTabs` does not exist.

- [ ] **Step 3: Implement hero build tabs model**

Create `src/features/heroes/model/heroBuildTabs.ts`:

```ts
import type { BuildFolderTabItem } from "@/features/builds";
import {
  getTabByPath,
  sortBuildTabs,
  type HeroBuildTab,
  type HeroBuildTabPath,
} from "@/features/game-data/heroes";

function toFolderTabItems(tabs: readonly HeroBuildTab[]): BuildFolderTabItem[] {
  return sortBuildTabs(tabs).map((tab) => ({
    id: tab.id,
    label: tab.label,
    accessibilityLabel: `Select ${tab.label} build tab`,
  }));
}

export function getHeroBuildTabViewModel(
  tabs: readonly HeroBuildTab[],
  activePath: HeroBuildTabPath,
) {
  const activeTopId = activePath[0] ?? "";
  const activeChildId = activePath[1];
  const activeTopTab = getTabByPath(tabs, [activeTopId]);
  const childTabs =
    activeTopTab?.kind === "group" && activeTopTab.children
      ? sortBuildTabs(activeTopTab.children)
      : [];

  return {
    activeChildId,
    activeTopId,
    childFolderTabs: toFolderTabItems(childTabs),
    topFolderTabs: toFolderTabItems(tabs),
  };
}
```

- [ ] **Step 4: Create sections**

Create `HeroBuildTabsSection.tsx`:
- wraps `BuildFolderTabs`
- props: tabs, selected ids, select handlers

Create `HeroBuildEquipmentSection.tsx`:
- renders both equipment blocks with `EquipmentVariantTabs`
- props: artifact ids, rune ids

Create `HeroBuildWeaponAwakeningSection.tsx`:
- renders `WeaponAwakeningPicker` and `WeaponAwakeningBonusList`
- props: selections, bonuses

Create `HeroBuildBranchSection.tsx`:
- renders label + `BranchBuilderGrid`
- props: view branch state

- [ ] **Step 5: Refactor HeroBuildScreen**

Modify `src/features/heroes/screens/HeroBuildScreen.tsx`:
- keep route-level state and hero/build lookup
- replace inline tabs/equipment/weapon/branch JSX with new sections
- remove local tab mapping code and use `getHeroBuildTabViewModel`
- keep visible UI behavior unchanged

- [ ] **Step 6: Verify Task 3**

Run:

```bash
npm test -- --runInBand src/features/heroes/__tests__/heroBuildTabsModel.test.ts src/features/heroes/__tests__/HeroBuildScreen.test.tsx
npm test -- --runInBand src/features/admin/__tests__/heroFeatureBoundaries.test.js
npx tsc --noEmit
```

- [ ] **Step 7: Commit Task 3**

```bash
git add src/features/heroes src/features/admin/__tests__ src/features/__tests__
git commit -m "refactor: split hero build screen sections"
```

---

### Task 4: Catalog Integrity Tests

**Purpose:** Catch broken ids and asset paths before they reach UI.

**Files:**
- Modify: `src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts`
- Create: `src/features/game-data/equipment/__tests__/equipmentCatalogDataIntegrity.test.ts`
- Create: `src/features/game-data/divinity/__tests__/divinityCatalogDataIntegrity.test.ts`
- Create: `src/features/game-data/__tests__/assetPathsDataIntegrity.test.ts`

- [ ] **Step 1: Add equipment integrity RED/GREEN test**

Create `src/features/game-data/equipment/__tests__/equipmentCatalogDataIntegrity.test.ts`:

```ts
import { equipmentArtifacts, equipmentRunes } from "../catalog";

function expectUniqueIds(items: readonly { id: string }[]) {
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
}

test("equipment catalogs use unique stable ids", () => {
  expectUniqueIds(equipmentArtifacts);
  expectUniqueIds(equipmentRunes);
});

test("equipment catalog asset paths use public img paths", () => {
  [...equipmentArtifacts, ...equipmentRunes].forEach((item) => {
    expect(item.icon).toMatch(/^\/img\//);
  });
});
```

Expected:
- Should PASS after creation unless catalog has real issues.

- [ ] **Step 2: Add divinity integrity test**

Create `src/features/game-data/divinity/__tests__/divinityCatalogDataIntegrity.test.ts`:

```ts
import {
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
} from "../catalog";

test("divinity branches are sorted and have unique ids", () => {
  expect(new Set(divinityBranches.map((branch) => branch.id)).size).toBe(
    divinityBranches.length,
  );
  expect(divinityBranches.map((branch) => branch.order)).toEqual(
    [...divinityBranches].map((branch) => branch.order).sort((a, b) => a - b),
  );
});

test("divinity skills reference known branches", () => {
  const branchIds = new Set(divinityBranches.map((branch) => branch.id));

  divinitySkills.forEach((skill) => {
    expect(branchIds.has(skill.branchId)).toBe(true);
  });
});

test("divinity template references supported columns and node types", () => {
  const supportedColumns = new Set(["left", "center", "right"]);
  const supportedNodeTypes = new Set(["minorStat", "majorSkill"]);

  divinityTreeTemplate.forEach((node) => {
    expect(supportedColumns.has(node.columnId)).toBe(true);
    expect(supportedNodeTypes.has(node.nodeType)).toBe(true);
  });
});
```

- [ ] **Step 3: Add cross-catalog hero build equipment references**

Extend `src/features/game-data/heroes/__tests__/heroCatalogDataIntegrity.test.ts`:

```ts
import { equipmentArtifacts, equipmentRunes } from "@/features/game-data/equipment";

test("hero builds reference known equipment ids", () => {
  const artifactIds = new Set(equipmentArtifacts.map((artifact) => artifact.id));
  const runeIds = new Set(equipmentRunes.map((rune) => rune.id));

  heroesWithBuilds.forEach((hero) => {
    const buildSet = getHeroBuildSet(hero.id);

    validateHeroBuildTabs(buildSet?.tabs ?? []).readyTabs.forEach((tab) => {
      tab.build?.equipment.artifactIds.forEach((artifactId) => {
        expect(artifactIds.has(artifactId)).toBe(true);
      });
      tab.build?.equipment.runeIds.forEach((runeId) => {
        expect(runeIds.has(runeId)).toBe(true);
      });
    });
  });
});
```

Adjust to match actual helpers in `heroCatalogDataIntegrity.test.ts`.

- [ ] **Step 4: Add asset path integrity test**

Create `src/features/game-data/__tests__/assetPathsDataIntegrity.test.ts`:

```ts
import { divinityBranches } from "@/features/game-data/divinity";
import { equipmentArtifacts, equipmentRunes } from "@/features/game-data/equipment";
import {
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
  heroes,
} from "@/features/game-data/heroes";
import { weaponAwakeningColors } from "@/features/game-data/weapon-awakening";

function expectPublicImagePath(path: string) {
  expect(path).toMatch(/^\/img\//);
}

test("catalog image paths use public img paths", () => {
  heroes.forEach((hero) => expectPublicImagePath(hero.icon));
  [...heroElements, ...heroFactions, ...heroRarities, ...heroRoles].forEach((entry) =>
    expectPublicImagePath(entry.icon),
  );
  divinityBranches.forEach((branch) => expectPublicImagePath(branch.icon));
  [...equipmentArtifacts, ...equipmentRunes].forEach((item) =>
    expectPublicImagePath(item.icon),
  );
  weaponAwakeningColors.forEach((color) => {
    if (color.icon) {
      expectPublicImagePath(color.icon);
    }
  });
});
```

- [ ] **Step 5: Verify Task 4**

Run:

```bash
npm test -- --runInBand src/features/game-data
npx tsc --noEmit
```

- [ ] **Step 6: Commit Task 4**

```bash
git add src/features/game-data
git commit -m "test: strengthen game data integrity checks"
```

---

### Task 5: Catalog Boundary Validation

**Purpose:** Decide whether static JSON casts are enough, or whether catalog modules need small runtime assertions.

**Important:** This is optional implementation work. Do not add heavy schema libraries unless the data becomes external/generated. Prefer lightweight assertions only if they catch real mistakes.

**Files:**
- Optional Create: `src/features/game-data/catalogValidation.ts`
- Optional Create: `src/features/game-data/__tests__/catalogValidation.test.ts`
- Optional Modify:
  - `src/features/game-data/divinity/catalog.ts`
  - `src/features/game-data/equipment/catalog.ts`
  - `src/features/game-data/weapon-awakening/catalog.ts`
  - `src/features/divinity/data/divinityLevels.ts`

- [ ] **Step 1: Write decision note in docs**

Update `docs/guidelines/code-style.md`:

```md
- Static local JSON MAY be cast at catalog boundaries when integrity tests cover ids, relationships, and asset paths.
- Runtime validation SHOULD be added when JSON becomes generated, user-provided, remote, or frequently edited by non-developers.
```

- [ ] **Step 2: If runtime guards are chosen, write RED test**

Create `src/features/game-data/__tests__/catalogValidation.test.ts`:

```ts
import { assertCatalogItems } from "../catalogValidation";

test("assertCatalogItems rejects duplicate ids", () => {
  expect(() =>
    assertCatalogItems("test", [{ id: "same" }, { id: "same" }]),
  ).toThrow("test contains duplicate id same");
});
```

- [ ] **Step 3: Implement minimal helper if needed**

Create `src/features/game-data/catalogValidation.ts`:

```ts
export function assertCatalogItems<T extends { id: string }>(
  catalogName: string,
  items: readonly T[],
): readonly T[] {
  const ids = new Set<string>();

  items.forEach((item) => {
    if (ids.has(item.id)) {
      throw new Error(`${catalogName} contains duplicate id ${item.id}`);
    }

    ids.add(item.id);
  });

  return items;
}
```

Only use it in catalog modules if the team accepts runtime assertions.

- [ ] **Step 4: Verify Task 5**

Run:

```bash
npm test -- --runInBand src/features/game-data src/features/__tests__/architectureBoundaries.test.js
npx tsc --noEmit
```

- [ ] **Step 5: Commit Task 5**

If docs only:

```bash
git add docs/guidelines/code-style.md
git commit -m "docs: clarify catalog validation policy"
```

If helper added:

```bash
git add docs/guidelines/code-style.md src/features/game-data
git commit -m "test: add catalog boundary validation"
```

---

### Task 6: Final Architecture Audit And Cleanup

**Purpose:** Remove small leftovers and verify the architecture rules are enforceable.

**Files:**
- Potential Delete: empty `src/features/heroes/types` directory if it exists locally
- Modify: `docs/guidelines/architecture.md`
- Modify: `docs/guidelines/project-patterns.md`
- Modify: `docs/guidelines/code-style.md`
- Test: all boundary tests and full suite

- [ ] **Step 1: Check empty directories**

Run:

```bash
find src app docs -type d -empty | sort
```

Expected:
- No empty feature placeholder directories.

If `src/features/heroes/types` appears and is untracked/empty, remove it:

```bash
rmdir src/features/heroes/types
```

- [ ] **Step 2: Check raw JSON boundaries**

Run:

```bash
rg "from .*\\.json|require\\(.*\\.json" src/features/*/screens src/features/*/hooks src/features/*/components src/shared app
```

Expected:
- No production screen/hook/component raw JSON imports.
- Test files and catalog boundary modules may still import JSON.

- [ ] **Step 3: Check feature dependency boundaries**

Run:

```bash
rg "@/features/admin" src/features --glob '!admin/**'
rg "@/features/(admin|builds|divinity|heroes)|@/shared/ui|react-native" src/features/game-data --glob '!**/__tests__/**'
rg "@/features/" src/shared
```

Expected:
- No forbidden production imports.

- [ ] **Step 4: Update docs if implementation changed rules**

Update:
- `docs/guidelines/architecture.md`
- `docs/guidelines/project-patterns.md`
- `docs/guidelines/code-style.md`

Only change docs for real decisions made during Tasks 1-5.

- [ ] **Step 5: Full verification**

Run:

```bash
npm test -- --runInBand
npx tsc --noEmit
git diff --check
git status --short --branch
```

Expected:
- all tests pass
- TypeScript passes
- diff check passes
- only intended files are changed before commit, then clean after commit

- [ ] **Step 6: Commit Task 6**

```bash
git add docs src
git commit -m "docs: complete architecture followup audit"
```

- [ ] **Step 7: Push**

```bash
git push
```

---

## Final Done Criteria

The follow-up architecture work is complete when:

- Public APIs exist for reused `builds` and `game-data` modules.
- Boundary tests prevent new deep imports where public APIs are required.
- Presentation folder convention is documented and tested.
- `HeroBuildScreen` is section-based and still passes existing behavior tests.
- Game-data integrity tests cover core ids, relationships, and asset paths.
- Catalog validation policy is documented, and runtime guards are added only if justified.
- Empty placeholder directories are removed.
- `npm test -- --runInBand` passes.
- `npx tsc --noEmit` passes.
- `git diff --check` passes.
- Branch is pushed.
