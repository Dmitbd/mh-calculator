const mockStorage = new Map<string, string>();
let mockWriteQueue = Promise.resolve();
let mockNextWriteBlock: Promise<void> | undefined;
let mockGetItemError: Error | undefined;
let mockNextSetItemError: Error | undefined;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
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
      const write = mockWriteQueue.then(async () => {
        await writeBlock;

        if (writeError) {
          throw writeError;
        }

        mockStorage.set(key, value);
      });
      mockWriteQueue = write.catch(() => undefined);

      return write;
    }),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useAntiqueCalculator } from "../hooks/useAntiqueCalculator";

beforeEach(() => {
  mockStorage.clear();
  mockWriteQueue = Promise.resolve();
  mockNextWriteBlock = undefined;
  mockGetItemError = undefined;
  mockNextSetItemError = undefined;
});

function readPersistedInput() {
  return JSON.parse(mockStorage.get("antique-rivalry-calculator") ?? "{}");
}

test("finishes loading with empty input when AsyncStorage rejects the read", async () => {
  mockGetItemError = new Error("read failed");
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  expect(result.current.input).toEqual({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 0,
    ownedTempleMaps: 0,
    includeCashback: true,
  });
});

test("keeps in-memory input and reports a controlled error when persistence rejects", async () => {
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));
  mockNextSetItemError = new Error("write failed");

  await act(async () => {
    await expect(result.current.setCoins(1_000)).resolves.toBeUndefined();
  });

  expect(result.current.input.coins).toBe(1_000);
  expect(result.current.storageError).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );

  await act(async () => {
    await expect(result.current.reset()).resolves.toBeUndefined();
  });

  expect(result.current.input.coins).toBe(0);
  expect(result.current.storageError).toBeNull();
});

test("setters persist normalized input and clamp allocation after coins decrease", async () => {
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setCoins(3_000);
    await result.current.convertOneToTemple();
    await result.current.convertOneToTemple();
    await result.current.convertOneToTemple();
    await result.current.setCoins(1_000);
    await result.current.setOwnedTombMaps(-2);
    await result.current.setOwnedTempleMaps(2.9);
  });

  expect(result.current.input).toEqual({
    coins: 1_000,
    templeMapAllocation: 1,
    ownedTombMaps: 0,
    ownedTempleMaps: 2,
    includeCashback: true,
  });
  expect(readPersistedInput()).toMatchObject(result.current.input);
});

test("conversion actions adjust allocation by one in each direction", async () => {
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setCoins(2_000);
    await result.current.convertOneToTemple();
  });
  expect(result.current.input.templeMapAllocation).toBe(1);

  await act(async () => {
    await result.current.convertOneToTombs();
  });
  expect(result.current.input.templeMapAllocation).toBe(0);
});

test("persists the cashback preference and resets it to enabled", async () => {
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setIncludeCashback(false);
  });

  expect(result.current.input.includeCashback).toBe(false);
  expect(readPersistedInput()).toMatchObject({ includeCashback: false });

  await act(async () => {
    await result.current.reset();
  });

  expect(result.current.input.includeCashback).toBe(true);
});

test("fast consecutive conversion actions retain every update in state and storage", async () => {
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setCoins(3_000);
  });

  await act(async () => {
    await Promise.all([
      result.current.convertOneToTemple(),
      result.current.convertOneToTemple(),
      result.current.convertOneToTemple(),
    ]);
  });

  expect(result.current.input.templeMapAllocation).toBe(3);
  expect(readPersistedInput()).toMatchObject({
    coins: 3_000,
    templeMapAllocation: 3,
  });
});

test("reset clears calculator state without waiting for an earlier write", async () => {
  const { result } = renderHook(() => useAntiqueCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setCoins(1_000);
  });

  let releaseWrite: () => void = () => undefined;
  mockNextWriteBlock = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });

  await act(async () => {
    const setMapsPromise = result.current.setOwnedTombMaps(2);
    const resetPromise = result.current.reset();

    releaseWrite();
    await Promise.all([setMapsPromise, resetPromise]);
  });

  expect(result.current.input).toEqual({
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 0,
    ownedTempleMaps: 0,
    includeCashback: true,
  });
  expect(readPersistedInput()).toMatchObject(result.current.input);
});
