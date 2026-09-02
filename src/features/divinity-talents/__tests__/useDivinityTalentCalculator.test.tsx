const mockStorage = new Map<string, string>();
let mockGetItemError: Error | undefined;
let mockNextGetItemBlock: Promise<void> | undefined;
let mockNextSetItemError: Error | undefined;
let mockNextWriteBlock: Promise<void> | undefined;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      const readBlock = mockNextGetItemBlock;
      mockNextGetItemBlock = undefined;
      await readBlock;

      if (mockGetItemError) {
        throw mockGetItemError;
      }

      return mockStorage.get(key) ?? null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      const writeBlock = mockNextWriteBlock;
      const writeError = mockNextSetItemError;
      mockNextWriteBlock = undefined;
      mockNextSetItemError = undefined;

      return (async () => {
        await writeBlock;
        if (writeError) {
          throw writeError;
        }
        mockStorage.set(key, value);
      })();
    }),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useDivinityTalentCalculator } from "../hooks/useDivinityTalentCalculator";

const STORAGE_KEY = "divinity-talents:v1";
const EMPTY_SELECTIONS = {
  left: null,
  center: null,
  right: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  mockGetItemError = undefined;
  mockNextGetItemBlock = undefined;
  mockNextSetItemError = undefined;
  mockNextWriteBlock = undefined;
});

function readPersistedSelections() {
  const record = JSON.parse(mockStorage.get(STORAGE_KEY) ?? "null") as {
    selections: unknown;
  } | null;
  return record?.selections;
}

async function renderLoadedCalculator() {
  const rendered = renderHook(() => useDivinityTalentCalculator());
  await waitFor(() => expect(rendered.result.current.isLoaded).toBe(true));
  return rendered;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("starts in loading state and restores persisted endpoints with their phases", async () => {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      selections: {
        left: { a: 3, b: 3, phase: "awaitingB" },
        center: { a: 1, b: 4, phase: "complete" },
        right: null,
      },
      updatedAt: "2026-09-01T10:20:30.000Z",
    }),
  );

  const { result } = renderHook(() => useDivinityTalentCalculator());
  expect(result.current.isLoaded).toBe(false);

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  expect(result.current.selections).toEqual({
    left: { a: 3, b: 3, phase: "awaitingB" },
    center: { a: 1, b: 4, phase: "complete" },
    right: null,
  });
  expect(result.current.requiredResources.selectedNodeCount).toBe(4);
});

test("finishes loading with empty selections when storage reading fails", async () => {
  mockGetItemError = new Error("read failed");

  const { result } = await renderLoadedCalculator();

  expect(result.current.selections).toEqual(EMPTY_SELECTIONS);
  expect(result.current.requiredResources.selectedNodeCount).toBe(0);
  expect(result.current.storageError).toBeNull();
});

test("ignores selection and reset until the initial storage load finishes", async () => {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      selections: {
        left: { a: 3, b: 3, phase: "awaitingB" },
        center: null,
        right: null,
      },
      updatedAt: "2026-09-01T10:20:30.000Z",
    }),
  );
  let releaseLoad: () => void = () => undefined;
  mockNextGetItemBlock = new Promise<void>((resolve) => {
    releaseLoad = resolve;
  });
  const { result } = renderHook(() => useDivinityTalentCalculator());

  await act(async () => {
    await result.current.selectNode("center", 1);
    await result.current.reset();
  });

  expect(result.current.isLoaded).toBe(false);
  expect(result.current.selections).toEqual(EMPTY_SELECTIONS);

  releaseLoad();
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  expect(result.current.selections).toEqual({
    left: { a: 3, b: 3, phase: "awaitingB" },
    center: null,
    right: null,
  });
});

test("first press selects and persists one awaitingB node with its cost", async () => {
  const { result } = await renderLoadedCalculator();

  await act(async () => {
    await result.current.selectNode("center", 1);
  });

  expect(result.current.selections.center).toEqual({
    a: 1,
    b: 1,
    phase: "awaitingB",
  });
  expect(result.current.requiredResources).toEqual({
    selectedNodeCount: 1,
    faith: 0,
    inheritedDivinity: 0,
    resonanceStone: 0,
  });
  expect(readPersistedSelections()).toEqual(result.current.selections);
});

test("keeps public actions stable across state updates", async () => {
  const { result } = await renderLoadedCalculator();
  const initialSelectNode = result.current.selectNode;
  const initialReset = result.current.reset;

  await act(async () => {
    await result.current.selectNode("center", 1);
  });

  expect(result.current.selectNode).toBe(initialSelectNode);
  expect(result.current.reset).toBe(initialReset);
});

test("updates local selections and resources before blocked persistence resolves", async () => {
  const { result } = await renderLoadedCalculator();
  let releasePersistence: () => void = () => undefined;
  mockNextWriteBlock = new Promise<void>((resolve) => {
    releasePersistence = resolve;
  });
  let selectionPromise!: Promise<void>;
  let selectionSettled = false;

  act(() => {
    selectionPromise = result.current.selectNode("center", 2);
    void selectionPromise.then(() => {
      selectionSettled = true;
    });
  });

  expect(selectionSettled).toBe(false);
  expect(result.current.selections.center).toEqual({
    a: 2,
    b: 2,
    phase: "awaitingB",
  });
  expect(result.current.requiredResources).toEqual({
    selectedNodeCount: 1,
    faith: 100,
    inheritedDivinity: 0,
    resonanceStone: 0,
  });

  await act(async () => {
    releasePersistence();
    await selectionPromise;
  });
});

test("second press expands the range and persists complete phase", async () => {
  const { result } = await renderLoadedCalculator();

  await act(async () => {
    await result.current.selectNode("center", 1);
    await result.current.selectNode("center", 2);
  });

  expect(result.current.selections.center).toEqual({
    a: 1,
    b: 2,
    phase: "complete",
  });
  expect(result.current.requiredResources).toMatchObject({
    selectedNodeCount: 2,
    faith: 100,
  });
  expect(readPersistedSelections()).toEqual(result.current.selections);
});

test("third press starts a new one-node awaitingB range", async () => {
  const { result } = await renderLoadedCalculator();

  await act(async () => {
    await result.current.selectNode("center", 1);
    await result.current.selectNode("center", 2);
    await result.current.selectNode("center", 4);
  });

  expect(result.current.selections.center).toEqual({
    a: 4,
    b: 4,
    phase: "awaitingB",
  });
  expect(result.current.requiredResources).toEqual({
    selectedNodeCount: 1,
    faith: 200,
    inheritedDivinity: 0,
    resonanceStone: 0,
  });
  expect(readPersistedSelections()).toEqual(result.current.selections);
});

test("rapid sequential presses persist full snapshots in action order and finish with the latest selection", async () => {
  const { result } = await renderLoadedCalculator();

  await act(async () => {
    await Promise.all([
      result.current.selectNode("left", 3),
      result.current.selectNode("left", 4),
      result.current.selectNode("left", 5),
    ]);
  });

  const persistedSnapshots = jest
    .mocked(AsyncStorage.setItem)
    .mock.calls.map(([, serializedRecord]) => {
      const record = JSON.parse(serializedRecord) as { selections: unknown };
      return record.selections;
    });
  expect(persistedSnapshots).toEqual([
    {
      left: { a: 3, b: 3, phase: "awaitingB" },
      center: null,
      right: null,
    },
    {
      left: { a: 3, b: 4, phase: "complete" },
      center: null,
      right: null,
    },
    {
      left: { a: 5, b: 5, phase: "awaitingB" },
      center: null,
      right: null,
    },
  ]);
  expect(result.current.selections).toEqual({
    left: { a: 5, b: 5, phase: "awaitingB" },
    center: null,
    right: null,
  });
  expect(readPersistedSelections()).toEqual({
    left: { a: 5, b: 5, phase: "awaitingB" },
    center: null,
    right: null,
  });
});

test("a late failed save does not replace a newer successful status", async () => {
  const { result } = await renderLoadedCalculator();
  let releaseOldWrite: () => void = () => undefined;
  mockNextWriteBlock = new Promise<void>((resolve) => {
    releaseOldWrite = resolve;
  });
  mockNextSetItemError = new Error("old write failed");
  let oldWrite!: Promise<void>;
  let newWrite!: Promise<void>;

  act(() => {
    oldWrite = result.current.selectNode("left", 3);
  });
  await act(flushMicrotasks);
  act(() => {
    newWrite = result.current.selectNode("left", 4);
  });
  await act(flushMicrotasks);
  const savesStartedBeforeRelease = jest.mocked(AsyncStorage.setItem).mock.calls
    .length;

  await act(async () => {
    releaseOldWrite();
    await Promise.all([oldWrite, newWrite]);
  });

  expect(savesStartedBeforeRelease).toBe(2);
  expect(result.current.storageError).toBeNull();
});

test("a late successful save does not clear a newer failure", async () => {
  const { result } = await renderLoadedCalculator();
  let releaseOldWrite: () => void = () => undefined;
  mockNextWriteBlock = new Promise<void>((resolve) => {
    releaseOldWrite = resolve;
  });
  let oldWrite!: Promise<void>;
  let newWrite!: Promise<void>;

  act(() => {
    oldWrite = result.current.selectNode("right", 3);
  });
  await act(flushMicrotasks);
  mockNextSetItemError = new Error("new write failed");
  act(() => {
    newWrite = result.current.selectNode("right", 4);
  });
  await act(flushMicrotasks);
  const savesStartedBeforeRelease = jest.mocked(AsyncStorage.setItem).mock.calls
    .length;
  const errorBeforeOldSaveFinishes = result.current.storageError;

  await act(async () => {
    releaseOldWrite();
    await Promise.all([oldWrite, newWrite]);
  });

  expect(savesStartedBeforeRelease).toBe(2);
  expect(errorBeforeOldSaveFinishes).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );
  expect(result.current.storageError).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );
});

test("failed write keeps local state, reports an error and allows a later write", async () => {
  const { result } = await renderLoadedCalculator();
  mockNextSetItemError = new Error("write failed");

  await act(async () => {
    await result.current.selectNode("right", 3);
  });

  expect(result.current.selections.right).toEqual({
    a: 3,
    b: 3,
    phase: "awaitingB",
  });
  expect(result.current.storageError).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );

  await act(async () => {
    await result.current.selectNode("right", 4);
  });

  expect(result.current.selections.right).toEqual({
    a: 3,
    b: 4,
    phase: "complete",
  });
  expect(result.current.storageError).toBeNull();
  expect(readPersistedSelections()).toEqual(result.current.selections);
});

test("reset clears every range, all totals and persisted selections", async () => {
  const { result } = await renderLoadedCalculator();

  await act(async () => {
    await result.current.selectNode("left", 3);
    await result.current.selectNode("center", 1);
    await result.current.reset();
  });

  expect(result.current.selections).toEqual(EMPTY_SELECTIONS);
  expect(result.current.requiredResources).toEqual({
    selectedNodeCount: 0,
    faith: 0,
    inheritedDivinity: 0,
    resonanceStone: 0,
  });
  expect(readPersistedSelections()).toEqual(EMPTY_SELECTIONS);
});

test("failed reset stays locally empty and a later selection persists from that state", async () => {
  const { result } = await renderLoadedCalculator();

  await act(async () => {
    await result.current.selectNode("center", 1);
  });
  mockNextSetItemError = new Error("reset failed");

  await act(async () => {
    await result.current.reset();
  });

  expect(result.current.selections).toEqual(EMPTY_SELECTIONS);
  expect(result.current.requiredResources).toEqual({
    selectedNodeCount: 0,
    faith: 0,
    inheritedDivinity: 0,
    resonanceStone: 0,
  });
  expect(result.current.storageError).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );
  expect(readPersistedSelections()).toEqual({
    left: null,
    center: { a: 1, b: 1, phase: "awaitingB" },
    right: null,
  });

  await act(async () => {
    await result.current.selectNode("right", 3);
  });

  expect(result.current.storageError).toBeNull();
  expect(readPersistedSelections()).toEqual({
    left: null,
    center: null,
    right: { a: 3, b: 3, phase: "awaitingB" },
  });
});

test("a remount loads persisted storage instead of failed local module state", async () => {
  const firstHook = await renderLoadedCalculator();
  mockNextSetItemError = new Error("write failed");

  await act(async () => {
    await firstHook.result.current.selectNode("center", 1);
  });
  expect(firstHook.result.current.selections.center).toEqual({
    a: 1,
    b: 1,
    phase: "awaitingB",
  });
  firstHook.unmount();

  const secondHook = renderHook(() => useDivinityTalentCalculator());
  const initialLoadedState = secondHook.result.current.isLoaded;
  await waitFor(() => expect(secondHook.result.current.isLoaded).toBe(true));
  const loadedSelections = secondHook.result.current.selections;

  await act(async () => {
    await secondHook.result.current.selectNode("right", 3);
  });

  expect(initialLoadedState).toBe(false);
  expect(loadedSelections).toEqual(EMPTY_SELECTIONS);
});
