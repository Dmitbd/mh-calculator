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

import AsyncStorage from "@react-native-async-storage/async-storage";
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

  expect(result.current.loadState).toBe("ready");

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

test("reports an error when the saved resources cannot be parsed", async () => {
  mockStorage.set("divinity-resources", "{broken-json");

  const { result } = renderHook(() => useDivinityResources());

  await waitFor(() => expect(result.current.loadState).toBe("error"));
  expect(result.current.isLoaded).toBe(false);
  expect(result.current.isRecoveryPending).toBe(false);
});

test("retries a failed resources load and becomes ready only after it succeeds", async () => {
  mockStorage.set("divinity-resources", "{broken-json");
  const { result } = renderHook(() => useDivinityResources());
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  let resolveRetry: (value: string) => void = () => undefined;
  const retryRead = new Promise<string>((resolve) => {
    resolveRetry = resolve;
  });
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(retryRead);
  const retryLoad = (
    result.current as typeof result.current & {
      retryLoad?: () => Promise<void>;
    }
  ).retryLoad;

  expect(retryLoad).toBeDefined();
  let retryPromise: Promise<void> | undefined;
  act(() => {
    retryPromise = retryLoad?.();
  });
  expect(result.current).toMatchObject({
    loadState: "error",
    isRecoveryPending: true,
  });

  resolveRetry(JSON.stringify({ gemCounts: { 7: 5 } }));
  await act(async () => {
    await retryPromise;
  });

  expect(result.current).toMatchObject({
    loadState: "ready",
    isRecoveryPending: false,
    resources: {
      chestCounts: { "600001": 0, "600076": 0 },
      gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 5 },
    },
  });
});

test("resets only failed resources and applies the empty record", async () => {
  mockStorage.set("divinity-progress", "progress-sentinel");
  mockStorage.set("divinity-resources", "{broken-json");
  const { result } = renderHook(() => useDivinityResources());
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  const resetAfterError = (
    result.current as typeof result.current & {
      resetResourcesAfterLoadError?: () => Promise<void>;
    }
  ).resetResourcesAfterLoadError;

  expect(resetAfterError).toBeDefined();
  await act(async () => {
    await resetAfterError?.();
  });

  expect(result.current).toMatchObject({
    loadState: "ready",
    isRecoveryPending: false,
    resources: {
      chestCounts: { "600001": 0, "600076": 0 },
      gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    },
  });
  expect(mockStorage.get("divinity-progress")).toBe("progress-sentinel");
});

test("keeps failed resources recoverable when reset storage rejects", async () => {
  mockStorage.set("divinity-resources", "{broken-json");
  const { result } = renderHook(() => useDivinityResources());
  await waitFor(() => expect(result.current.loadState).toBe("error"));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("write failed"));

  await act(async () => {
    await result.current.resetResourcesAfterLoadError();
  });

  expect(result.current).toMatchObject({
    loadState: "error",
    isRecoveryPending: false,
  });
  expect(mockStorage.get("divinity-resources")).toBe("{broken-json");
});

test("keeps failed resources recoverable when retry rejects", async () => {
  mockStorage.set("divinity-resources", "{broken-json");
  const { result } = renderHook(() => useDivinityResources());
  await waitFor(() => expect(result.current.loadState).toBe("error"));
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("read failed"));

  await act(async () => {
    await result.current.retryLoad();
  });

  expect(result.current).toMatchObject({
    loadState: "error",
    isRecoveryPending: false,
  });
});

test("runs only one resources recovery operation at a time", async () => {
  mockStorage.set("divinity-resources", "{broken-json");
  const { result } = renderHook(() => useDivinityResources());
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  let resolveRetry: (value: string) => void = () => undefined;
  const retryRead = new Promise<string>((resolve) => {
    resolveRetry = resolve;
  });
  jest.mocked(AsyncStorage.getItem).mockReturnValue(retryRead);
  jest.mocked(AsyncStorage.getItem).mockClear();
  let firstRetry: Promise<void> | undefined;
  let secondRetry: Promise<void> | undefined;

  act(() => {
    firstRetry = result.current.retryLoad();
    secondRetry = result.current.retryLoad();
  });

  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  resolveRetry(JSON.stringify({ gemCounts: { 6: 2 } }));
  await act(async () => {
    await Promise.all([firstRetry, secondRetry]);
  });
});
