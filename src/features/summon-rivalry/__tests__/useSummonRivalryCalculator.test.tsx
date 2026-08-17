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

import { useSummonRivalryCalculator } from "../hooks/useSummonRivalryCalculator";

const emptyInput = {
  ownedCommonScrolls: 0,
  ownedLimitedScrolls: 0,
  ownedFactionScrolls: 0,
  ownedFateCrystals: 0,
  purchasedCommonScrolls: 0,
  purchasedLimitedScrolls: 0,
  purchasedFateCrystals: 0,
  includeCashback: true,
};

beforeEach(() => {
  mockStorage.clear();
  mockWriteQueue = Promise.resolve();
  mockNextWriteBlock = undefined;
  mockGetItemError = undefined;
  mockNextSetItemError = undefined;
});

function readPersistedInput() {
  return JSON.parse(mockStorage.get("summon-rivalry-calculator:v1") ?? "{}");
}

test("finishes loading with empty input when storage rejects the read", async () => {
  mockGetItemError = new Error("read failed");
  const { result } = renderHook(() => useSummonRivalryCalculator());

  await waitFor(() => expect(result.current.isLoaded).toBe(true));
  expect(result.current.input).toEqual(emptyInput);
});

test("owned resource setters normalize and persist every field", async () => {
  const { result } = renderHook(() => useSummonRivalryCalculator());
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setOwnedCommonScrolls("12.9");
    await result.current.setOwnedLimitedScrolls(-2);
    await result.current.setOwnedFactionScrolls(3.8);
    await result.current.setOwnedFateCrystals(4);
  });

  expect(result.current.input).toMatchObject({
    ownedCommonScrolls: 12,
    ownedLimitedScrolls: 0,
    ownedFactionScrolls: 3,
    ownedFateCrystals: 4,
  });
  expect(readPersistedInput()).toMatchObject(result.current.input);
});

test("purchase actions use ten-item steps and never become negative", async () => {
  const { result } = renderHook(() => useSummonRivalryCalculator());
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.incrementPurchase("purchasedCommonScrolls");
    await result.current.incrementPurchase("purchasedLimitedScrolls");
    await result.current.incrementPurchase("purchasedFateCrystals");
    await result.current.decrementPurchase("purchasedCommonScrolls");
    await result.current.decrementPurchase("purchasedCommonScrolls");
  });

  expect(result.current.input).toMatchObject({
    purchasedCommonScrolls: 0,
    purchasedLimitedScrolls: 10,
    purchasedFateCrystals: 10,
  });
});

test("fast increments retain every update in memory and storage", async () => {
  const { result } = renderHook(() => useSummonRivalryCalculator());
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await Promise.all([
      result.current.incrementPurchase("purchasedCommonScrolls"),
      result.current.incrementPurchase("purchasedCommonScrolls"),
      result.current.incrementPurchase("purchasedCommonScrolls"),
    ]);
  });

  expect(result.current.input.purchasedCommonScrolls).toBe(30);
  expect(readPersistedInput()).toMatchObject({ purchasedCommonScrolls: 30 });
});

test("keeps memory state and reports a controlled persistence error", async () => {
  const { result } = renderHook(() => useSummonRivalryCalculator());
  await waitFor(() => expect(result.current.isLoaded).toBe(true));
  mockNextSetItemError = new Error("write failed");

  await act(async () => {
    await result.current.setOwnedCommonScrolls(5);
  });

  expect(result.current.input.ownedCommonScrolls).toBe(5);
  expect(result.current.storageError).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );
});

test("reset wins after a delayed write and re-enables cashback", async () => {
  const { result } = renderHook(() => useSummonRivalryCalculator());
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setIncludeCashback(false);
  });

  let releaseWrite: () => void = () => undefined;
  mockNextWriteBlock = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });

  await act(async () => {
    const setResource = result.current.setOwnedFateCrystals(2);
    const reset = result.current.reset();
    releaseWrite();
    await Promise.all([setResource, reset]);
  });

  expect(result.current.input).toEqual(emptyInput);
  expect(readPersistedInput()).toMatchObject(emptyInput);
});
