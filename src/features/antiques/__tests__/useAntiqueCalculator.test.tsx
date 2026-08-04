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

import { useAntiqueCalculator } from "../hooks/useAntiqueCalculator";

beforeEach(() => {
  mockStorage.clear();
  mockWriteQueue = Promise.resolve();
  mockNextWriteBlock = undefined;
});

function readPersistedInput() {
  return JSON.parse(mockStorage.get("antique-rivalry-calculator") ?? "{}");
}

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
  });
  expect(readPersistedInput()).toMatchObject(result.current.input);
});
