# Multi-Build Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin branch builder collect all available target builds and download one complete strict `HeroBuildSet` JSON.

**Architecture:** Keep existing single-build validation unchanged. Add pure admin model helpers for target leaf traversal, path labels/keys, full `HeroBuildSet` assembly, and multi-tab validation. Extend the builder hook with saved per-tab builds and keep the screen as orchestration plus focused UI sections.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Native Testing Library, local JSON catalogs.

---

## Non-Negotiable Rule

Do not change branch depth/progress validation.

Specifically:

- Do not change `MIN_BRANCH_PROGRESS_LEVEL`.
- Do not change how `validateBranchBuild` decides `progress.minimumLevel`.
- Do not change how major nodes are required.
- Multi-build validation must call `validateBranchBuild` for each saved leaf tab and only add tab-scoped missing/invalid aggregation around it.

## Target Files

- Create: `src/features/admin/model/multiBuildExport.ts`
- Create: `src/features/admin/__tests__/multiBuildExport.test.ts`
- Modify: `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- Modify: `src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`
- Modify: `src/features/admin/components/DownloadJsonButton.tsx`
- Modify: `src/features/admin/components/branch-builder/DownloadSection.tsx`
- Modify: `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- Optional Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`
- Optional Modify: `src/features/admin/types/admin.types.ts`

---

### Task 1: Pure Multi-Build Model Helpers

**Files:**
- Create: `src/features/admin/model/multiBuildExport.ts`
- Create: `src/features/admin/__tests__/multiBuildExport.test.ts`

- [ ] **Step 1: Write failing tests for leaf traversal and path labels**

Create `src/features/admin/__tests__/multiBuildExport.test.ts`:

```ts
import {
  getBuildTargetLeafTabs,
  getBuildTargetPathKey,
  getBuildTargetPathLabel,
} from "../model/multiBuildExport";
import { buildTargetTabs } from "../data/buildTargetTabs";

describe("multiBuildExport target helpers", () => {
  test("returns all build target leaf paths", () => {
    expect(getBuildTargetLeafTabs(buildTargetTabs).map((leaf) => leaf.path)).toEqual([
      ["pvp"],
      ["pve", "bosses"],
      ["pve", "campaign"],
    ]);
  });

  test("creates stable path keys and labels", () => {
    expect(getBuildTargetPathKey(["pve", "bosses"])).toBe("pve/bosses");
    expect(getBuildTargetPathLabel(buildTargetTabs, ["pve", "bosses"])).toBe(
      "PvE -> Боссы",
    );
  });
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand src/features/admin/__tests__/multiBuildExport.test.ts
```

Expected:
- FAIL because `../model/multiBuildExport` does not exist.

- [ ] **Step 3: Implement target helpers**

Create `src/features/admin/model/multiBuildExport.ts` with:

```ts
import type { HeroBuildTab, HeroBuildTabPath } from "@/features/game-data/heroes";
import { getTabByPath, sortBuildTabs } from "@/features/game-data/heroes";

export type BuildTargetLeafTab = {
  path: HeroBuildTabPath;
  label: string;
  gameMode: NonNullable<HeroBuildTab["gameMode"]>;
};

export function getBuildTargetPathKey(path: HeroBuildTabPath): string {
  return path.join("/");
}

export function getBuildTargetPathLabel(
  tabs: readonly HeroBuildTab[],
  path: HeroBuildTabPath,
): string {
  const labels: string[] = [];
  let currentTabs = [...tabs];

  for (const segment of path) {
    const tab = sortBuildTabs(currentTabs).find((entry) => entry.id === segment);

    if (!tab) {
      return path.join(" -> ");
    }

    labels.push(tab.label);
    currentTabs = tab.children ? [...tab.children] : [];
  }

  return labels.join(" -> ");
}

export function getBuildTargetLeafTabs(
  tabs: readonly HeroBuildTab[],
  parentPath: HeroBuildTabPath = [],
  inheritedGameMode?: HeroBuildTab["gameMode"],
): BuildTargetLeafTab[] {
  return sortBuildTabs([...tabs]).flatMap((tab) => {
    const path = [...parentPath, tab.id];
    const gameMode = tab.gameMode ?? inheritedGameMode;

    if (tab.kind === "group" && tab.children) {
      return getBuildTargetLeafTabs(tab.children, path, gameMode);
    }

    if (!gameMode) {
      return [];
    }

    return [
      {
        path,
        label: getBuildTargetPathLabel(tabs, path),
        gameMode,
      },
    ];
  });
}
```

- [ ] **Step 4: Verify Task 1**

```bash
npm test -- --runInBand src/features/admin/__tests__/multiBuildExport.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit Task 1**

```bash
git add src/features/admin/model/multiBuildExport.ts src/features/admin/__tests__/multiBuildExport.test.ts
git commit -m "feat: add multi build target helpers"
```

---

### Task 2: Assemble HeroBuildSet From Saved Leaf Builds

**Files:**
- Modify: `src/features/admin/model/multiBuildExport.ts`
- Modify: `src/features/admin/__tests__/multiBuildExport.test.ts`

- [ ] **Step 1: Write failing assembly test**

Extend `multiBuildExport.test.ts`:

```ts
import type { DivinityBranchBuildExport } from "@/features/game-data/builds/types";
import { validateHeroBuildTabs } from "@/features/game-data/heroes";
import { buildHeroBuildSetFromSavedBuilds } from "../model/multiBuildExport";

const build = (gameMode: "pvp" | "pve"): DivinityBranchBuildExport => ({
  schemaVersion: 1,
  gameMode,
  heroId: "bastet",
  heroName: "Бастет",
  columns: { left: "asterial", center: "psyche", right: "immortality" },
  majorNodes: [],
  weaponAwakening: [],
  equipment: { artifactIds: ["axe-of-pangu"], runeIds: ["air"] },
  progress: {},
  activeNodes: [],
  metadata: {
    createdAt: "2026-06-22T00:00:00.000Z",
    source: "manual-branch-builder",
  },
});

test("builds a schema v2 hero build set from saved leaf builds", () => {
  const buildSet = buildHeroBuildSetFromSavedBuilds(buildTargetTabs, {
    pvp: build("pvp"),
    "pve/bosses": build("pve"),
    "pve/campaign": build("pve"),
  });

  expect(buildSet.schemaVersion).toBe(2);
  expect(buildSet.tabs[0].build?.gameMode).toBe("pvp");
  expect(buildSet.tabs[1].children?.[0].build?.gameMode).toBe("pve");
  expect("targetTabPath" in buildSet.tabs[0].build!).toBe(false);
  expect(validateHeroBuildTabs(buildSet)).toEqual([]);
});
```

Expected RED:
- FAIL because `buildHeroBuildSetFromSavedBuilds` does not exist.

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand src/features/admin/__tests__/multiBuildExport.test.ts
```

- [ ] **Step 3: Implement assembly helper**

In `multiBuildExport.ts` add:

```ts
import type { DivinityBranchBuildExport } from "@/features/game-data/builds/types";
import type { HeroBuildSet } from "@/features/game-data/heroes";

export type SavedBuildsByPath = Record<string, DivinityBranchBuildExport>;

export function buildHeroBuildSetFromSavedBuilds(
  tabs: readonly HeroBuildTab[],
  savedBuilds: SavedBuildsByPath,
): HeroBuildSet {
  return {
    schemaVersion: 2,
    tabs: sortBuildTabs([...tabs]).map((tab) =>
      attachSavedBuildToTab(tab, savedBuilds, []),
    ),
  };
}

function attachSavedBuildToTab(
  tab: HeroBuildTab,
  savedBuilds: SavedBuildsByPath,
  parentPath: HeroBuildTabPath,
): HeroBuildTab {
  const path = [...parentPath, tab.id];

  if (tab.kind === "group") {
    return {
      ...tab,
      build: null,
      children: tab.children?.map((child) =>
        attachSavedBuildToTab(child, savedBuilds, path),
      ),
    };
  }

  return {
    ...tab,
    build: savedBuilds[getBuildTargetPathKey(path)] ?? null,
  };
}
```

- [ ] **Step 4: Verify Task 2**

```bash
npm test -- --runInBand src/features/admin/__tests__/multiBuildExport.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit Task 2**

```bash
git add src/features/admin/model/multiBuildExport.ts src/features/admin/__tests__/multiBuildExport.test.ts
git commit -m "feat: assemble full hero build set export"
```

---

### Task 3: Multi-Build Validation

**Files:**
- Modify: `src/features/admin/model/multiBuildExport.ts`
- Modify: `src/features/admin/__tests__/multiBuildExport.test.ts`
- Do not modify: `src/features/admin/utils/validateBranchBuild.ts` except if a type export is strictly required.

- [ ] **Step 1: Write failing validation tests**

Add tests:

```ts
import { validateMultiBuildExport } from "../model/multiBuildExport";
import { branchBuilderValidationCatalog } from "../data/branchBuilderCatalogs";

test("requires every target leaf tab to have a saved build", () => {
  const result = validateMultiBuildExport({
    targetTabs: buildTargetTabs,
    savedBuilds: {
      pvp: build("pvp"),
    },
    validationCatalog: branchBuilderValidationCatalog,
  });

  expect(result.isValid).toBe(false);
  expect(result.errors.map((error) => error.message)).toContain(
    "PvE -> Боссы: Сохраните билд для этой вкладки.",
  );
  expect(result.errors.map((error) => error.message)).toContain(
    "PvE -> Кампания: Сохраните билд для этой вкладки.",
  );
});

test("rejects saved build with wrong target game mode", () => {
  const result = validateMultiBuildExport({
    targetTabs: buildTargetTabs,
    savedBuilds: {
      pvp: build("pve"),
      "pve/bosses": build("pve"),
      "pve/campaign": build("pve"),
    },
    validationCatalog: branchBuilderValidationCatalog,
  });

  expect(result.isValid).toBe(false);
  expect(result.errors.map((error) => error.message)).toContain(
    "PvP: Режим игры не соответствует выбранной вкладке.",
  );
});
```

Add a branch-depth regression test that uses an invalid saved build and expects current message:

```ts
test("keeps existing branch depth validation per tab", () => {
  const invalidPvp = { ...build("pvp"), progress: {} };
  const result = validateMultiBuildExport({
    targetTabs: buildTargetTabs,
    savedBuilds: {
      pvp: invalidPvp,
      "pve/bosses": build("pve"),
      "pve/campaign": build("pve"),
    },
    validationCatalog: branchBuilderValidationCatalog,
  });

  expect(result.errors.some((error) =>
    error.message.includes("PvP: Минимальный уровень левой ветки"),
  )).toBe(true);
});
```

Expected RED:
- FAIL because `validateMultiBuildExport` does not exist.

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand src/features/admin/__tests__/multiBuildExport.test.ts
```

- [ ] **Step 3: Implement validation helper**

Add to `multiBuildExport.ts`:

```ts
import type {
  BranchBuildValidationError,
  BranchBuildValidationResult,
} from "../types/admin.types";
import { validateBranchBuild } from "../utils/validateBranchBuild";

type ValidationCatalog = Parameters<typeof validateBranchBuild>[1];

export function validateMultiBuildExport(params: {
  targetTabs: readonly HeroBuildTab[];
  savedBuilds: SavedBuildsByPath;
  validationCatalog: ValidationCatalog;
}): BranchBuildValidationResult {
  const errors: BranchBuildValidationError[] = [];

  getBuildTargetLeafTabs(params.targetTabs).forEach((leaf) => {
    const key = getBuildTargetPathKey(leaf.path);
    const build = params.savedBuilds[key];

    if (!build) {
      errors.push({
        code: "multiBuild.missingTab" as never,
        message: `${leaf.label}: Сохраните билд для этой вкладки.`,
        path: key,
      });
      return;
    }

    if (build.gameMode !== leaf.gameMode) {
      errors.push({
        code: "multiBuild.gameModeMismatch" as never,
        message: `${leaf.label}: Режим игры не соответствует выбранной вкладке.`,
        path: key,
      });
    }

    const result = validateBranchBuild(
      {
        gameMode: build.gameMode,
        heroId: build.heroId,
        heroName: build.heroName,
        columns: build.columns,
        majorNodes: build.majorNodes,
        weaponAwakening: build.weaponAwakening,
        equipment: build.equipment,
        progress: build.progress,
      },
      params.validationCatalog,
    );

    result.errors.forEach((error) => {
      errors.push({
        ...error,
        message: `${leaf.label}: ${error.message}`,
        path: error.path ? `${key}.${error.path}` : key,
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

If `as never` is undesirable, add explicit error codes to `BranchBuildValidationErrorCode` in `validation.types.ts`.

- [ ] **Step 4: Verify Task 3**

```bash
npm test -- --runInBand src/features/admin/__tests__/multiBuildExport.test.ts src/features/admin/__tests__/validateBranchBuild.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit Task 3**

```bash
git add src/features/admin/model/multiBuildExport.ts src/features/admin/__tests__/multiBuildExport.test.ts src/features/admin/types/validation.types.ts
git commit -m "feat: validate complete multi build export"
```

---

### Task 4: Hook State For Saved Builds

**Files:**
- Modify: `src/features/admin/hooks/useDivinityBranchBuilder.ts`
- Modify: `src/features/admin/__tests__/useDivinityBranchBuilder.test.ts`

- [ ] **Step 1: Write failing hook tests**

Extend `useDivinityBranchBuilder.test.ts` with tests:

```ts
it("saves the current tab build without targetTabPath", () => {
  const { result } = renderHook(() =>
    useDivinityBranchBuilder({ colors: weaponAwakeningColors, slots: weaponAwakeningSlots }),
  );

  fillValidBuilder(result);

  act(() => {
    result.current.saveCurrentTargetBuild("2026-05-30T00:00:00.000Z");
  });

  expect(result.current.savedBuildsByPath.pvp).toBeTruthy();
  expect("targetTabPath" in result.current.savedBuildsByPath.pvp).toBe(false);
});

it("full export is blocked until every target tab is saved", () => {
  const { result } = renderHook(() =>
    useDivinityBranchBuilder({ colors: weaponAwakeningColors, slots: weaponAwakeningSlots }),
  );

  fillValidBuilder(result);
  act(() => {
    result.current.saveCurrentTargetBuild("2026-05-30T00:00:00.000Z");
  });

  expect(result.current.buildFullExport()).toBeNull();
});
```

Use existing test helpers in the file; if no helper exists, extract one from existing valid export tests.

Expected RED:
- FAIL because `saveCurrentTargetBuild`, `savedBuildsByPath`, and `buildFullExport` do not exist.

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand src/features/admin/__tests__/useDivinityBranchBuilder.test.ts
```

- [ ] **Step 3: Implement saved build state**

In `useDivinityBranchBuilder.ts`:

- import helpers:

```ts
import {
  buildHeroBuildSetFromSavedBuilds,
  getBuildTargetPathKey,
  validateMultiBuildExport,
  type SavedBuildsByPath,
} from "../model/multiBuildExport";
```

- add state:

```ts
const [savedBuildsByPath, setSavedBuildsByPath] = useState<SavedBuildsByPath>({});
```

- keep existing `buildExport` for single current tab, but add a helper to omit `targetTabPath`:

```ts
function toCommittedBuild(exported: DivinityBranchBuilderExport): DivinityBranchBuildExport {
  const { targetTabPath: _targetTabPath, ...build } = exported;
  return build;
}
```

- implement:

```ts
const saveCurrentTargetBuild = useCallback((createdAt?: string) => {
  const exported = buildExport(createdAt);

  if (!exported) {
    return false;
  }

  const key = getBuildTargetPathKey(targetTabPath);

  setSavedBuildsByPath((current) => ({
    ...current,
    [key]: toCommittedBuild(exported),
  }));

  return true;
}, [buildExport, targetTabPath]);
```

- implement:

```ts
const buildFullExport = useCallback(() => {
  const result = validateMultiBuildExport({
    targetTabs: buildTargetTabs,
    savedBuilds: savedBuildsByPath,
    validationCatalog: branchBuilderValidationCatalog,
  });

  if (!result.isValid) {
    return null;
  }

  return buildHeroBuildSetFromSavedBuilds(buildTargetTabs, savedBuildsByPath);
}, [savedBuildsByPath]);
```

- return `savedBuildsByPath`, `saveCurrentTargetBuild`, `buildFullExport`.

- [ ] **Step 4: Verify Task 4**

```bash
npm test -- --runInBand src/features/admin/__tests__/useDivinityBranchBuilder.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit Task 4**

```bash
git add src/features/admin/hooks/useDivinityBranchBuilder.ts src/features/admin/__tests__/useDivinityBranchBuilder.test.ts
git commit -m "feat: store saved builds per target tab"
```

---

### Task 5: Screen Actions And Full Download

**Files:**
- Modify: `src/features/admin/components/DownloadJsonButton.tsx`
- Modify: `src/features/admin/components/branch-builder/DownloadSection.tsx`
- Modify: `src/features/admin/screens/DivinityBranchBuilderScreen.tsx`
- Modify: `src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx`

- [ ] **Step 1: Write failing screen test**

Update `DivinityBranchBuilderScreen.test.tsx`:

```ts
it("shows save tab and full json download actions", () => {
  render(<DivinityBranchBuilderScreen />);

  expect(screen.getByText("Сохранить вкладку")).toBeTruthy();
  expect(screen.getByText("Скачать полный JSON")).toBeTruthy();
});

it("blocks full json download when target tabs are missing", () => {
  render(<DivinityBranchBuilderScreen />);

  fireEvent.press(screen.getByText("Скачать полный JSON"));

  expect(screen.getByText("PvP: Сохраните билд для этой вкладки.")).toBeTruthy();
  expect(screen.getByText("PvE -> Боссы: Сохраните билд для этой вкладки.")).toBeTruthy();
  expect(screen.getByText("PvE -> Кампания: Сохраните билд для этой вкладки.")).toBeTruthy();
});
```

Expected RED:
- FAIL because buttons/messages do not exist.

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx
```

- [ ] **Step 3: Update DownloadJsonButton props**

Change component to render two buttons:

```ts
type DownloadJsonButtonProps = {
  errors: readonly BranchBuildValidationError[];
  onErrorsLayout?: (event: LayoutChangeEvent) => void;
  onSaveCurrent: () => void;
  onDownloadFull: () => void;
};
```

UI:

- primary or first button: `Сохранить вкладку`;
- second button: `Скачать полный JSON`;
- keep existing errors rendering unchanged.

- [ ] **Step 4: Update DownloadSection**

Pass:

```ts
onSaveCurrent
onDownloadFull
```

instead of old `onPress`.

- [ ] **Step 5: Update screen handlers**

In `DivinityBranchBuilderScreen.tsx` use returned hook values:

- `saveCurrentTargetBuild`;
- `buildFullExport`;
- `savedBuildsByPath`.

Save handler:

1. validate current tab using existing `validateBranchBuild(buildValidationDraft(), branchBuilderValidationCatalog)`;
2. show current-tab errors without tab prefix;
3. if valid, call `saveCurrentTargetBuild()`;
4. clear errors or show success if existing UI pattern supports it. If no success UI exists, clearing errors is enough.

Download handler:

1. validate full export through hook or model;
2. if invalid, show prefixed errors;
3. if valid, download `buildFullExport()` as `${selectedHeroId}.json`.

If hook only returns `buildFullExport()` and not validation errors, add `validateFullExport()` to hook.

- [ ] **Step 6: Verify Task 5**

```bash
npm test -- --runInBand src/features/admin/__tests__/DivinityBranchBuilderScreen.test.tsx src/features/admin/__tests__/useDivinityBranchBuilder.test.ts
npx tsc --noEmit
```

- [ ] **Step 7: Commit Task 5**

```bash
git add src/features/admin
git commit -m "feat: download complete hero build set"
```

---

### Task 6: Final Verification And Push

**Files:**
- Any docs updates if behavior wording changed during implementation.

- [ ] **Step 1: Run targeted regression for branch depth**

```bash
npm test -- --runInBand src/features/admin/__tests__/validateBranchBuild.test.ts src/features/admin/__tests__/multiBuildExport.test.ts
```

Expected:
- Existing branch depth/progress validation tests still pass.

- [ ] **Step 2: Run full verification**

```bash
npm test -- --runInBand
npx tsc --noEmit
git diff --check
git status --short --branch
```

Expected:
- all tests pass;
- TypeScript passes;
- diff check passes;
- branch is ahead with only committed work or clean after final commit.

- [ ] **Step 3: Push**

```bash
git push
```

---

## Done Criteria

- Builder can save a build per target leaf tab.
- Full JSON download is blocked until every available target leaf tab is saved and valid.
- Errors for full JSON are prefixed with target tab labels.
- Downloaded JSON is `HeroBuildSet` with `schemaVersion: 2`.
- Nested builds do not contain `targetTabPath`.
- Existing branch depth/progress validation is unchanged and tested.
- Full test suite and TypeScript pass.
