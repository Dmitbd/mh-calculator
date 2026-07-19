# Divinity Owned Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted, collapsible «Мои ресурсы» panel whose user-selected chests and individual divinity gems reduce the displayed divinity upgrade remainder with the agreed deterministic allocation rules.

**Architecture:** Keep the existing raw divinity cost calculation unchanged. Add a pure remaining-cost model, a dedicated AsyncStorage-backed resource hook, and one UI panel integrated between the ring and summary; the summary receives only the calculated remainder.

**Tech Stack:** TypeScript 6, React 19, React Native 0.85, Expo 56, AsyncStorage, Jest 29, Testing Library for React Native.

## Global Constraints

- One chest yields exactly one fixed reward option for one gem level, never every listed option at once.
- The user chooses chest and individual-gem counts manually; do not calculate or display a recommended chest count.
- Apply individual gems first, then small chests `600001` to levels 1–5 from low to high, then large chests `600076` to levels 6–7 from low to high, then remaining large chests to any deficit at levels 1–5 from low to high.
- Clamp each displayed remaining gem cost at zero; do not carry a fixed reward's excess into another gem level.
- Persist resource counts after the panel is collapsed and after page reload; the panel's reset affects resources only and the existing progress reset affects progress only.
- Reuse `divinityGemChests`, `GemIcon`, chest PNG paths, and `resolveAssetUri`; do not duplicate APK data or image files.
- Use the existing project chevron pair `▾` / `▴` from `HeroGuideSelector` for the collapsed and expanded «Мои ресурсы» states; do not use `⌄` / `⌃`.
- Keep `−`, the resource icon/label, and `+` in one compact left-aligned group with visible equal gaps; keep the numeric counter pinned to the right edge.
- Do not add Faith, chests `600031`/`600077`, automatic chest recommendations, or unrelated refactoring.
- Tests must be functional behavior tests; do not assert CSS or presentation-only style values.
- Do not commit or push these feature changes until the user gives a separate command.

---

### Task 1: Pure remaining-cost allocation model

**Files:**
- Modify: `src/features/divinity/model/types.ts`
- Create: `src/features/divinity/model/divinityOwnedResources.ts`
- Create: `src/features/divinity/model/calculateRemainingDivinityCosts.ts`
- Create: `src/features/divinity/__tests__/calculateRemainingDivinityCosts.test.ts`

**Interfaces:**
- Consumes: `StoneCosts`, `DivinityGemChestId`, `DivinityGemLevel`, and the existing `divinityGemChests` catalog.
- Produces: `DivinityOwnedResources`, `createEmptyDivinityOwnedResources(): DivinityOwnedResources`, and `calculateRemainingDivinityCosts(totalCost: StoneCosts, resources: DivinityOwnedResources): StoneCosts`.

- [ ] **Step 1: Add the owned-resource types and write failing allocation tests**

Add the import at the top of `src/features/divinity/model/types.ts`, then append the three owned-resource types:

```ts
import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

export type DivinityChestCounts = Record<DivinityGemChestId, number>;

export type DivinityGemCounts = Record<DivinityGemLevel, number>;

export type DivinityOwnedResources = {
  chestCounts: DivinityChestCounts;
  gemCounts: DivinityGemCounts;
};
```

Create `src/features/divinity/__tests__/calculateRemainingDivinityCosts.test.ts` with real catalog data and these cases:

```ts
import {
  calculateRemainingDivinityCosts,
} from "../model/calculateRemainingDivinityCosts";
import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import type { StoneCosts } from "../model/types";

const costs = (
  values: Partial<StoneCosts> = {},
): StoneCosts => ({
  stone1: 0,
  stone2: 0,
  stone3: 0,
  stone4: 0,
  stone5: 0,
  stone6: 0,
  stone7: 0,
  ...values,
});

test("keeps raw costs when owned resources are empty", () => {
  const totalCost = costs({ stone1: 82, stone6: 398, stone7: 422 });

  expect(
    calculateRemainingDivinityCosts(
      totalCost,
      createEmptyDivinityOwnedResources(),
    ),
  ).toEqual(totalCost);
});

test("subtracts individual gems before allocating chests", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.gemCounts[1] = 20;
  resources.chestCounts["600001"] = 1;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 20, stone2: 12 }),
      resources,
    ),
  ).toEqual(costs());
});

test("small chests close levels one through five from low to high", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 3;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 21, stone2: 13, stone3: 6 }),
      resources,
    ),
  ).toEqual(costs({ stone2: 1, stone3: 6 }));
});

test("does not carry a fixed chest reward excess to the next level", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 1;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 1, stone2: 12 }),
      resources,
    ),
  ).toEqual(costs({ stone2: 12 }));
});

test("large chests close levels six and seven before lower levels", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600076"] = 3;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 40, stone6: 5, stone7: 4 }),
      resources,
    ),
  ).toEqual(costs({ stone1: 40, stone7: 1 }));
});

test("remaining large chests close low-level deficits after small chests run out", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 1;
  resources.chestCounts["600076"] = 2;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 41, stone2: 24 }),
      resources,
    ),
  ).toEqual(costs());
});

test("extra resources never create negative remaining costs", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.gemCounts[7] = 100;
  resources.chestCounts["600001"] = 100;
  resources.chestCounts["600076"] = 100;

  expect(
    calculateRemainingDivinityCosts(
      costs({ stone1: 1, stone7: 1 }),
      resources,
    ),
  ).toEqual(costs());
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/calculateRemainingDivinityCosts.test.ts
```

Expected: FAIL because `calculateRemainingDivinityCosts` and `createEmptyDivinityOwnedResources` do not exist.

- [ ] **Step 3: Implement the empty-state factory and allocation function**

Create `src/features/divinity/model/divinityOwnedResources.ts`:

```ts
import type { DivinityGemLevel } from "@/features/game-data/divinity";

import type { DivinityOwnedResources } from "./types";

export const divinityGemLevels: DivinityGemLevel[] = [1, 2, 3, 4, 5, 6, 7];

export function createEmptyDivinityOwnedResources(): DivinityOwnedResources {
  return {
    chestCounts: {
      "600001": 0,
      "600076": 0,
    },
    gemCounts: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
    },
  };
}
```

Create `src/features/divinity/model/calculateRemainingDivinityCosts.ts`:

```ts
import { divinityGemChests } from "@/features/game-data/divinity";
import type {
  DivinityGemChest,
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import { divinityGemLevels } from "./divinityOwnedResources";
import type { DivinityOwnedResources, StoneCosts } from "./types";

const stoneKeyByLevel: Record<DivinityGemLevel, keyof StoneCosts> = {
  1: "stone1",
  2: "stone2",
  3: "stone3",
  4: "stone4",
  5: "stone5",
  6: "stone6",
  7: "stone7",
};

const chestById = new Map(
  divinityGemChests.map((chest) => [chest.id, chest] as const),
);

function applyChestCount(
  remaining: StoneCosts,
  chestId: DivinityGemChestId,
  count: number,
  levelOrder: DivinityGemLevel[],
): void {
  const chest = chestById.get(chestId) as DivinityGemChest | undefined;

  if (!chest) {
    return;
  }

  for (let index = 0; index < count; index += 1) {
    const level = levelOrder.find(
      (candidate) => remaining[stoneKeyByLevel[candidate]] > 0,
    );

    if (!level) {
      return;
    }

    const reward = chest.contents.find((content) => content.gemLevel === level);

    if (!reward) {
      continue;
    }

    const key = stoneKeyByLevel[level];
    remaining[key] = Math.max(0, remaining[key] - reward.amount);
  }
}

export function calculateRemainingDivinityCosts(
  totalCost: StoneCosts,
  resources: DivinityOwnedResources,
): StoneCosts {
  const remaining = { ...totalCost };

  for (const level of divinityGemLevels) {
    const key = stoneKeyByLevel[level];
    remaining[key] = Math.max(0, remaining[key] - resources.gemCounts[level]);
  }

  applyChestCount(remaining, "600001", resources.chestCounts["600001"], [
    1, 2, 3, 4, 5,
  ]);
  applyChestCount(remaining, "600076", resources.chestCounts["600076"], [
    6, 7, 1, 2, 3, 4, 5,
  ]);

  return remaining;
}
```

- [ ] **Step 4: Run focused and existing calculation tests and verify GREEN**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/calculateRemainingDivinityCosts.test.ts src/features/divinity/__tests__/calculateDivinityTotals.test.ts
```

Expected: both suites PASS with no warnings.

- [ ] **Step 5: Self-review without committing**

Run `git diff --check`, verify no input object is mutated, record the changed files and RED/GREEN evidence in the task report, and leave all changes uncommitted.

---

### Task 2: Persisted resource state and hook

**Files:**
- Create: `src/features/divinity/storage/divinityResourcesStorage.ts`
- Create: `src/features/divinity/hooks/useDivinityResources.ts`
- Create: `src/features/divinity/__tests__/divinityResourcesStorage.test.ts`
- Create: `src/features/divinity/__tests__/useDivinityResources.test.tsx`

**Interfaces:**
- Consumes: `DivinityOwnedResources` and `createEmptyDivinityOwnedResources()` from Task 1.
- Produces: `loadDivinityResources()`, `saveDivinityResources(resources)`, `resetDivinityResources()`, and `useDivinityResources()` with async increment/decrement/reset handlers.

- [ ] **Step 1: Write failing storage behavior tests**

Create `src/features/divinity/__tests__/divinityResourcesStorage.test.ts`:

```ts
const mockStorage = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

import type { DivinityOwnedResources } from "../model/types";
import {
  loadDivinityResources,
  resetDivinityResources,
  saveDivinityResources,
} from "../storage/divinityResourcesStorage";

const savedResources: DivinityOwnedResources = {
  chestCounts: { "600001": 2, "600076": 3 },
  gemCounts: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
};

beforeEach(() => {
  mockStorage.clear();
});

test("saves and loads divinity resources", async () => {
  await saveDivinityResources(savedResources);

  await expect(loadDivinityResources()).resolves.toMatchObject(savedResources);
});

test("resets only divinity resources", async () => {
  mockStorage.set("divinity-progress", "progress-sentinel");
  await saveDivinityResources(savedResources);

  await resetDivinityResources();

  await expect(loadDivinityResources()).resolves.toMatchObject({
    chestCounts: { "600001": 0, "600076": 0 },
    gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  });
  expect(mockStorage.get("divinity-progress")).toBe("progress-sentinel");
});
```

- [ ] **Step 2: Run the storage test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/divinityResourcesStorage.test.ts
```

Expected: FAIL because `divinityResourcesStorage` does not exist.

- [ ] **Step 3: Implement dedicated AsyncStorage persistence**

Create `src/features/divinity/storage/divinityResourcesStorage.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";

const STORAGE_KEY = "divinity-resources";

export type DivinityResourcesRecord = DivinityOwnedResources & {
  updatedAt: string;
};

function defaultRecord(): DivinityResourcesRecord {
  return {
    ...createEmptyDivinityOwnedResources(),
    updatedAt: new Date(0).toISOString(),
  };
}

export async function loadDivinityResources(): Promise<DivinityResourcesRecord> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultRecord();
  }

  const parsed = JSON.parse(storedValue) as Partial<DivinityResourcesRecord>;
  const defaults = createEmptyDivinityOwnedResources();

  return {
    chestCounts: {
      ...defaults.chestCounts,
      ...parsed.chestCounts,
    },
    gemCounts: {
      ...defaults.gemCounts,
      ...parsed.gemCounts,
    },
    updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function saveDivinityResources(
  resources: DivinityOwnedResources,
): Promise<DivinityResourcesRecord> {
  const record: DivinityResourcesRecord = {
    chestCounts: { ...resources.chestCounts },
    gemCounts: { ...resources.gemCounts },
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  return record;
}

export async function resetDivinityResources(): Promise<DivinityResourcesRecord> {
  return saveDivinityResources(createEmptyDivinityOwnedResources());
}
```

- [ ] **Step 4: Run the storage test and verify GREEN**

Run the command from Step 2. Expected: PASS with no warnings.

- [ ] **Step 5: Write failing hook tests**

Create `src/features/divinity/__tests__/useDivinityResources.test.tsx`:

```ts
const mockStorage = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useDivinityResources } from "../hooks/useDivinityResources";

beforeEach(() => {
  mockStorage.clear();
});

test("updates and persists chest and gem counts", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.incrementChest("600001");
    await result.current.incrementGem(7);
  });

  expect(result.current.resources.chestCounts["600001"]).toBe(1);
  expect(result.current.resources.gemCounts[7]).toBe(1);

  const persisted = JSON.parse(mockStorage.get("divinity-resources") ?? "{}");
  expect(persisted.chestCounts["600001"]).toBe(1);
  expect(persisted.gemCounts[7]).toBe(1);
});

test("keeps zero counts nonnegative and retains rapid increments", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.decrementChest("600076");
    const firstIncrement = result.current.incrementGem(1);
    const secondIncrement = result.current.incrementGem(1);
    await Promise.all([firstIncrement, secondIncrement]);
  });

  expect(result.current.resources.chestCounts["600076"]).toBe(0);
  expect(result.current.resources.gemCounts[1]).toBe(2);
});

test("resets owned resources", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.incrementChest("600076");
    await result.current.incrementGem(6);
    await result.current.resetResources();
  });

  expect(result.current.resources).toEqual({
    chestCounts: { "600001": 0, "600076": 0 },
    gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  });
});
```

- [ ] **Step 6: Run the hook test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/useDivinityResources.test.tsx
```

Expected: FAIL because `useDivinityResources` does not exist.

- [ ] **Step 7: Implement the resource hook**

Create `src/features/divinity/hooks/useDivinityResources.ts`:

```ts
import { useEffect, useRef, useState } from "react";

import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";
import {
  loadDivinityResources,
  resetDivinityResources,
  saveDivinityResources,
} from "../storage/divinityResourcesStorage";

type ResourceUpdater = (
  current: DivinityOwnedResources,
) => DivinityOwnedResources;

export function useDivinityResources() {
  const [resources, setResources] = useState(createEmptyDivinityOwnedResources);
  const resourcesRef = useRef(resources);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadDivinityResources().then((record) => {
      if (!isMounted) {
        return;
      }

      const loadedResources: DivinityOwnedResources = {
        chestCounts: record.chestCounts,
        gemCounts: record.gemCounts,
      };
      resourcesRef.current = loadedResources;
      setResources(loadedResources);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateResources = async (updater: ResourceUpdater) => {
    const nextResources = updater(resourcesRef.current);
    resourcesRef.current = nextResources;
    setResources(nextResources);
    await saveDivinityResources(nextResources);
  };

  const incrementChest = async (chestId: DivinityGemChestId) => {
    await updateResources((current) => ({
      ...current,
      chestCounts: {
        ...current.chestCounts,
        [chestId]: current.chestCounts[chestId] + 1,
      },
    }));
  };

  const decrementChest = async (chestId: DivinityGemChestId) => {
    await updateResources((current) => ({
      ...current,
      chestCounts: {
        ...current.chestCounts,
        [chestId]: Math.max(0, current.chestCounts[chestId] - 1),
      },
    }));
  };

  const incrementGem = async (level: DivinityGemLevel) => {
    await updateResources((current) => ({
      ...current,
      gemCounts: {
        ...current.gemCounts,
        [level]: current.gemCounts[level] + 1,
      },
    }));
  };

  const decrementGem = async (level: DivinityGemLevel) => {
    await updateResources((current) => ({
      ...current,
      gemCounts: {
        ...current.gemCounts,
        [level]: Math.max(0, current.gemCounts[level] - 1),
      },
    }));
  };

  const resetResources = async () => {
    const record = await resetDivinityResources();
    const nextResources: DivinityOwnedResources = {
      chestCounts: record.chestCounts,
      gemCounts: record.gemCounts,
    };
    resourcesRef.current = nextResources;
    setResources(nextResources);
  };

  return {
    resources,
    isLoaded,
    incrementChest,
    decrementChest,
    incrementGem,
    decrementGem,
    resetResources,
  };
}
```

The returned interface is:

```ts
{
  resources,
  isLoaded,
  incrementChest(chestId: DivinityGemChestId): Promise<void>,
  decrementChest(chestId: DivinityGemChestId): Promise<void>,
  incrementGem(level: DivinityGemLevel): Promise<void>,
  decrementGem(level: DivinityGemLevel): Promise<void>,
  resetResources(): Promise<void>,
}
```

- [ ] **Step 8: Run focused persistence tests and verify GREEN**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/divinityResourcesStorage.test.ts src/features/divinity/__tests__/useDivinityResources.test.tsx
```

Expected: both suites PASS with no warnings.

- [ ] **Step 9: Self-review without committing**

Run `git diff --check`, confirm the storage key and reset are independent from `divinity-progress`, record RED/GREEN evidence, and leave all changes uncommitted.

---

### Task 3: Collapsible resources UI and screen integration

**Files:**
- Create: `src/features/divinity/ui/DivinityResourcesPanel.tsx`
- Create: `src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx`
- Modify: `src/features/divinity/ui/DivinitySummary.tsx`
- Modify: `src/features/divinity/screens/DivinityScreen.tsx`
- Modify: `src/features/divinity/__tests__/divinityScreen.test.tsx`

**Interfaces:**
- Consumes: `DivinityOwnedResources`, `divinityGemChests`, `divinityGemLevels`, `GemIcon`, `resolveAssetUri`, `useDivinityResources()`, and `calculateRemainingDivinityCosts()`.
- Produces: `DivinityResourcesPanel` with controlled count callbacks; `DivinityScreen` passes the calculated remainder to `DivinitySummary`.

- [ ] **Step 1: Write the failing panel behavior test**

Create `src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx`:

```tsx
jest.mock("@/shared/lib/resolveAssetUri", () => ({
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import { DivinityResourcesPanel } from "../ui/DivinityResourcesPanel";

test("reveals real chest assets and resource controls", () => {
  const onIncrementChest = jest.fn();
  const onIncrementGem = jest.fn();
  const onReset = jest.fn();

  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onDecrementChest={jest.fn()}
      onDecrementGem={jest.fn()}
      onIncrementChest={onIncrementChest}
      onIncrementGem={onIncrementGem}
      onReset={onReset}
    />,
  );

  expect(screen.getByText("Мои ресурсы")).toBeTruthy();
  expect(screen.queryByText("Сундуки")).toBeNull();

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));

  expect(screen.getByText("Сундуки")).toBeTruthy();
  expect(screen.getByText("Самоцветы")).toBeTruthy();
  expect(
    screen.getByLabelText("Персон. сундук с самоцветом божественности").props
      .source,
  ).toEqual({
    uri: "resolved:/img/divinity/chests/chest-600001.png",
  });
  expect(
    screen.getByLabelText(
      "Большой персонализированный сундук с самоцветом божественности",
    ).props.source,
  ).toEqual({
    uri: "resolved:/img/divinity/chests/chest-600076.png",
  });

  fireEvent.press(screen.getByLabelText("Добавить сундук 600001"));
  fireEvent.press(screen.getByLabelText("Добавить самоцвет 7 ур."));
  fireEvent.press(screen.getByLabelText("Сбросить мои ресурсы"));

  expect(onIncrementChest).toHaveBeenCalledWith("600001");
  expect(onIncrementGem).toHaveBeenCalledWith(7);
  expect(onReset).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByLabelText("Свернуть мои ресурсы"));
  expect(screen.queryByText("Сундуки")).toBeNull();
});
```

- [ ] **Step 2: Add a failing screen integration test**

Append this test to `src/features/divinity/__tests__/divinityScreen.test.tsx`:

```ts
test("applies, preserves and resets owned resources", async () => {
  mockStorage.clear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 82")).toBeTruthy();
    expect(screen.getByLabelText("Осталось самоцветов 6 ур.: 398")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  fireEvent.press(screen.getByLabelText("Добавить сундук 600001"));
  fireEvent.press(screen.getByLabelText("Добавить сундук 600076"));
  fireEvent.press(screen.getByLabelText("Добавить самоцвет 1 ур."));

  await waitFor(() => {
    expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 61")).toBeTruthy();
    expect(screen.getByLabelText("Осталось самоцветов 6 ур.: 394")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Свернуть мои ресурсы"));

  expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 61")).toBeTruthy();
  expect(screen.getByLabelText("Осталось самоцветов 6 ур.: 394")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  fireEvent.press(screen.getByLabelText("Сбросить мои ресурсы"));

  await waitFor(() => {
    expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 82")).toBeTruthy();
    expect(screen.getByLabelText("Осталось самоцветов 6 ур.: 398")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the panel and screen tests and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx src/features/divinity/__tests__/divinityScreen.test.tsx
```

Expected: FAIL because the panel and integration do not exist.

- [ ] **Step 4: Implement the controlled collapsible panel**

Create `src/features/divinity/ui/DivinityResourcesPanel.tsx`:

```tsx
import { useState } from "react";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { divinityGemChests } from "@/features/game-data/divinity";
import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { divinityGemLevels } from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";
import { GemIcon } from "./GemIcon";

type DivinityResourcesPanelProps = {
  resources: DivinityOwnedResources;
  onIncrementChest: (chestId: DivinityGemChestId) => void;
  onDecrementChest: (chestId: DivinityGemChestId) => void;
  onIncrementGem: (level: DivinityGemLevel) => void;
  onDecrementGem: (level: DivinityGemLevel) => void;
  onReset: () => void;
};

type CounterRowProps = {
  addLabel: string;
  icon: ReactNode;
  label: string;
  removeLabel: string;
  value: number;
  onAdd: () => void;
  onRemove: () => void;
};

function CounterRow({
  addLabel,
  icon,
  label,
  removeLabel,
  value,
  onAdd,
  onRemove,
}: CounterRowProps) {
  return (
    <View style={styles.counterRow}>
      <Pressable
        accessibilityLabel={removeLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: value === 0 }}
        disabled={value === 0}
        onPress={onRemove}
        style={[styles.stepButton, value === 0 && styles.stepButtonDisabled]}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <View style={styles.resourceIdentity}>
        {icon}
        <Text numberOfLines={2} style={styles.resourceLabel}>
          {label}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={addLabel}
        accessibilityRole="button"
        onPress={onAdd}
        style={styles.stepButton}
      >
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
      <View style={styles.countBox}>
        <Text style={styles.countText}>{value}</Text>
      </View>
    </View>
  );
}

export function DivinityResourcesPanel({
  resources,
  onIncrementChest,
  onDecrementChest,
  onIncrementGem,
  onDecrementGem,
  onReset,
}: DivinityResourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={
          isExpanded ? "Свернуть мои ресурсы" : "Раскрыть мои ресурсы"
        }
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((current) => !current)}
        style={styles.header}
      >
        <Text style={styles.title}>Мои ресурсы</Text>
        <Text style={styles.chevron}>{isExpanded ? "⌃" : "⌄"}</Text>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Сундуки</Text>
          {divinityGemChests.map((chest) => (
            <CounterRow
              key={chest.id}
              addLabel={`Добавить сундук ${chest.id}`}
              icon={
                <Image
                  accessibilityLabel={chest.name}
                  resizeMode="contain"
                  source={{ uri: resolveAssetUri(chest.icon) }}
                  style={styles.chestIcon}
                />
              }
              label={chest.id === "600001" ? "Самоцветы 1–5 ур." : "Самоцветы 6–7 ур."}
              removeLabel={`Убрать сундук ${chest.id}`}
              value={resources.chestCounts[chest.id]}
              onAdd={() => onIncrementChest(chest.id)}
              onRemove={() => onDecrementChest(chest.id)}
            />
          ))}

          <Text style={styles.sectionTitle}>Самоцветы</Text>
          {divinityGemLevels.map((level: DivinityGemLevel) => (
            <CounterRow
              key={level}
              addLabel={`Добавить самоцвет ${level} ур.`}
              icon={<GemIcon level={level} size={30} />}
              label={`${level} ур.`}
              removeLabel={`Убрать самоцвет ${level} ур.`}
              value={resources.gemCounts[level]}
              onAdd={() => onIncrementGem(level)}
              onRemove={() => onDecrementGem(level)}
            />
          ))}

          <Pressable
            accessibilityLabel="Сбросить мои ресурсы"
            accessibilityRole="button"
            onPress={onReset}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>Сбросить мои ресурсы</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    overflow: "hidden",
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff3d1",
  },
  chevron: {
    fontSize: 24,
    fontWeight: "800",
    color: "#e9c46a",
  },
  content: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: "#e9c46a",
  },
  counterRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 8,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8b512f",
    backgroundColor: "#4b2818",
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  stepButtonText: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900",
    color: "#ffe09d",
  },
  resourceIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resourceLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#f4ddb0",
  },
  chestIcon: {
    width: 42,
    height: 42,
  },
  countBox: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#281710",
  },
  countText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff8e7",
  },
  resetButton: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8b512f",
    paddingVertical: 13,
    backgroundColor: "#351c11",
  },
  resetButtonText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#ffd8b0",
  },
});
```

- [ ] **Step 5: Make summary values accessible and integrate the model/hook into the screen**

In `DivinitySummary.tsx`, add this label to each value without changing its visible text:

```tsx
<Text
  accessibilityLabel={`Осталось самоцветов ${index + 1} ур.: ${metric.value}`}
  style={styles.value}
>
  {metric.value}
</Text>
```

In `DivinityScreen.tsx`:

1. Call `useDivinityResources()` alongside `useDivinityProgress()`.
2. Keep the loading screen visible until both hooks report `isLoaded`.
3. Calculate `remainingCost = calculateRemainingDivinityCosts(totalCost.totalCost, resources)`.
4. Render `DivinityResourcesPanel` immediately before `DivinitySummary`.
5. Wrap async handlers with `void` in the same style as existing progress callbacks.
6. Pass `remainingCost` to `DivinitySummary`.

- [ ] **Step 6: Run the panel and screen tests and verify GREEN**

Run the command from Step 3. Expected: both suites PASS with no warnings.

- [ ] **Step 7: Run the whole divinity test group and TypeScript**

Run:

```bash
npm test -- --runInBand src/features/divinity
npx tsc --noEmit
```

Expected: all divinity suites PASS and TypeScript exits 0.

- [ ] **Step 8: Self-review without committing**

Run `git diff --check`, verify there is no UI or data for Faith or unrelated chests, record RED/GREEN evidence, and leave all changes uncommitted.

---

### Task 4: End-to-end verification

**Files:**
- Verify only; modify implementation or tests only when a failing check identifies a concrete defect.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: test, build, asset-path, and localhost visual evidence.

- [ ] **Step 1: Run the complete test suite**

Run `npm test -- --runInBand`. Expected: all suites and tests PASS.

- [ ] **Step 2: Run static and web build checks**

Run `npx tsc --noEmit` and `npm run export:web`. Expected: both exit 0; the existing Supabase Node-version warning is allowed only if it is unchanged from baseline.

- [ ] **Step 3: Verify static asset paths**

With Expo web running at `http://localhost:8081`, request both chest PNG URLs and all seven gem PNG URLs. Expected: HTTP 200 and image content types for every path.

- [ ] **Step 4: Verify the screen in the in-app browser**

At `http://localhost:8081/divinity`, visually confirm the panel is above «Расход ресурсов», starts collapsed, shows both real chest icons and seven real gem icons when opened, updates remaining costs, preserves them when collapsed, and resets only owned resources.

- [ ] **Step 5: Final scope and working-tree check**

Run `git diff --check` and `git status --short`. Confirm the only changes are the design/plan documents and files named in Tasks 1–3. Do not commit or push.

---

### Task 5: Project chevron and left-aligned resource controls

**Files:**
- Modify: `src/features/divinity/ui/DivinityResourcesPanel.tsx`
- Modify: `src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx`

**Interfaces:**
- Consumes: the existing `DivinityResourcesPanel` controlled props and the project chevron pattern from `HeroGuideSelector`.
- Produces: the same public component API; only the dropdown indicator and internal row layout change.

- [ ] **Step 1: Add a failing functional test for the project chevron pair**

Append this test to `src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx`:

```tsx
test("uses the project chevron pair for collapsed and expanded states", () => {
  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onDecrementChest={jest.fn()}
      onDecrementGem={jest.fn()}
      onIncrementChest={jest.fn()}
      onIncrementGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  expect(screen.getByTestId("divinity-resources-chevron").props.children).toBe(
    "▾",
  );
  expect(screen.queryByText("⌄")).toBeNull();
  expect(screen.queryByText("⌃")).toBeNull();

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));

  expect(screen.getByTestId("divinity-resources-chevron").props.children).toBe(
    "▴",
  );
});
```

Do not add CSS, coordinate, or style-object assertions. The exact control spacing remains a browser-verified visual requirement.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx
```

Expected: FAIL because `divinity-resources-chevron` does not exist and the panel still renders `⌄` / `⌃`.

- [ ] **Step 3: Replace the dropdown glyphs with the existing project chevron pattern**

Replace the current chevron text inside the panel header with:

```tsx
<View style={styles.chevronBox}>
  <Text style={styles.chevron} testID="divinity-resources-chevron">
    {isExpanded ? "▴" : "▾"}
  </Text>
</View>
```

Replace the current `chevron` style and add `chevronBox`:

```ts
chevron: {
  color: "#e9c46a",
  fontSize: 18,
  fontWeight: "800",
  lineHeight: 18,
},
chevronBox: {
  alignItems: "center",
  flexShrink: 0,
  height: 24,
  justifyContent: "center",
  width: 24,
},
```

- [ ] **Step 4: Group `− / resource / +` on the left and keep the counter on the right**

Replace the `CounterRow` return value with this structure while preserving every existing accessibility label and callback:

```tsx
return (
  <View style={styles.counterRow}>
    <View style={styles.counterControls}>
      <Pressable
        accessibilityLabel={removeLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: value === 0 }}
        disabled={value === 0}
        onPress={onRemove}
        style={[styles.stepButton, value === 0 && styles.stepButtonDisabled]}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <View style={styles.resourceIdentity}>
        {icon}
        <Text numberOfLines={1} style={styles.resourceLabel}>
          {label}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={addLabel}
        accessibilityRole="button"
        onPress={onAdd}
        style={styles.stepButton}
      >
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
    </View>
    <View style={styles.countBox}>
      <Text style={styles.countText}>{value}</Text>
    </View>
  </View>
);
```

Update the row styles exactly as follows:

```ts
counterRow: {
  minHeight: 76,
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 16,
  backgroundColor: "#3b2114",
  padding: 8,
},
counterControls: {
  minWidth: 0,
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},
resourceIdentity: {
  width: 64,
  flexShrink: 1,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
},
countBox: {
  minWidth: 48,
  height: 40,
  marginLeft: "auto",
  paddingHorizontal: 8,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#281710",
},
```

At 320 pt, the controls and counter require `40 + 10 + 64 + 10 + 40 + 48 = 212` px; the approximately 228 px inner row width leaves 16 px of separation before the right-aligned counter without horizontal overflow.

- [ ] **Step 5: Run focused and divinity tests and verify GREEN**

Run:

```bash
npm test -- --runInBand src/features/divinity/__tests__/DivinityResourcesPanel.test.tsx
npm test -- --runInBand src/features/divinity
npx tsc --noEmit
```

Expected: the focused panel suite, all divinity suites, and TypeScript PASS with no new warnings.

- [ ] **Step 6: Verify web rendering in the user's in-app browser**

At `http://localhost:8081/divinity`, verify:

- collapsed header shows `▾` and expanded header shows `▴` in the same 24 px box;
- chest and gem rows visually group `− / icon and label / +` on the left with equal gaps;
- every counter remains aligned at the right edge;
- both chest icons and all seven gem icons remain loaded;
- plus, minus, collapse, persistence, and reset behavior remain unchanged;
- the current viewport has no horizontal overflow.

- [ ] **Step 7: Final verification without committing**

Run:

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run export:web
git diff --check
git status --short
```

Expected: all tests pass, TypeScript and web export exit 0, the known Supabase Node-version warning is unchanged, and only the already-approved owned-resources files/documents are modified. Do not commit or push.
