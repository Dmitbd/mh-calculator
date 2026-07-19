const mockStorage = new Map<string, string>();
let mockWriteQueue = Promise.resolve();
let mockNextWriteBlock: Promise<void> | undefined;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      const writeBlock = mockNextWriteBlock;
      mockNextWriteBlock = undefined;
      const write = mockWriteQueue.then(async () => {
        await writeBlock;
        mockStorage.set(key, value);
      });
      mockWriteQueue = write;

      return write;
    }),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useDivinityResources } from "../hooks/useDivinityResources";

beforeEach(() => {
  mockStorage.clear();
  mockWriteQueue = Promise.resolve();
  mockNextWriteBlock = undefined;
});

function blockNextStorageWrite() {
  let releaseWrite: () => void = () => undefined;
  mockNextWriteBlock = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });

  return () => releaseWrite();
}

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

test("an immediate increment after reset wins in state and storage", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.incrementChest("600001");
  });

  const releaseResetWrite = blockNextStorageWrite();

  await act(async () => {
    const resetPromise = result.current.resetResources();
    const incrementPromise = result.current.incrementChest("600001");

    releaseResetWrite();
    await Promise.all([resetPromise, incrementPromise]);
  });

  const persisted = JSON.parse(mockStorage.get("divinity-resources") ?? "{}");
  expect({
    persistedCount: persisted.chestCounts["600001"],
    uiCount: result.current.resources.chestCounts["600001"],
  }).toEqual({
    persistedCount: 1,
    uiCount: 1,
  });
});
