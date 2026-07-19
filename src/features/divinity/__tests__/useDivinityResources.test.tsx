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

test("sets and persists normalized chest and gem counts", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setChestCount("600001", 1_200);
    await result.current.setGemCount(7, -4);
  });

  expect(result.current.resources.chestCounts["600001"]).toBe(999);
  expect(result.current.resources.gemCounts[7]).toBe(0);

  const persisted = JSON.parse(mockStorage.get("divinity-resources") ?? "{}");
  expect(persisted.chestCounts["600001"]).toBe(999);
  expect(persisted.gemCounts[7]).toBe(0);
});

test("resets owned resources", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setChestCount("600076", 1);
    await result.current.setGemCount(6, 1);
    await result.current.resetResources();
  });

  expect(result.current.resources).toEqual({
    chestCounts: { "600001": 0, "600076": 0 },
    gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  });
});

test("an immediate set after reset wins in state and storage", async () => {
  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setChestCount("600001", 1);
  });

  const releaseResetWrite = blockNextStorageWrite();

  await act(async () => {
    const resetPromise = result.current.resetResources();
    const setCountPromise = result.current.setChestCount("600001", 1);

    releaseResetWrite();
    await Promise.all([resetPromise, setCountPromise]);
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
