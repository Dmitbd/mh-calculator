const mockStorage = new Map<string, string>();
let mockNextSetItemError: Error | undefined;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      if (mockNextSetItemError) {
        const error = mockNextSetItemError;
        mockNextSetItemError = undefined;
        throw error;
      }
      mockStorage.set(key, value);
    }),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  beastlyEchoesConfig,
  towerOfBabelConfig,
} from "@/features/game-data/weekly-rivalry";

import { useWeeklyRivalryCalculator } from "../hooks/useWeeklyRivalryCalculator";
import { getWeeklyRivalryStorageKey } from "../storage/weeklyRivalryStorage";

beforeEach(() => {
  mockStorage.clear();
  mockNextSetItemError = undefined;
});

test("updates and persists both quantities", async () => {
  const { result } = renderHook(() =>
    useWeeklyRivalryCalculator(beastlyEchoesConfig),
  );
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setOwnedSpendResource("80.9");
    await result.current.setOwnedWeeklyEventChests("5.8");
  });

  expect(result.current.input).toMatchObject({
    ownedSpendResource: 80,
    ownedWeeklyEventChests: 5,
  });
  expect(
    JSON.parse(
      mockStorage.get(getWeeklyRivalryStorageKey("beastly-echoes")) ?? "{}",
    ),
  ).toMatchObject(result.current.input);
});

test("keeps all cashback switches independent", async () => {
  const { result } = renderHook(() =>
    useWeeklyRivalryCalculator(beastlyEchoesConfig),
  );
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setIncludeRivalryCashback(true);
    await result.current.setIncludeWeeklyEventChestCashback(true);
    await result.current.setIncludeQuestCashback(true);
    await result.current.setIncludeSharedCashback(true);
  });

  expect(result.current.input).toMatchObject({
    includeRivalryCashback: true,
    includeWeeklyEventChestCashback: true,
    includeQuestCashback: true,
    includeSharedCashback: true,
  });
});

test("derives both zones from the shared seal and chest inputs", async () => {
  const { result } = renderHook(() =>
    useWeeklyRivalryCalculator(beastlyEchoesConfig),
  );
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setIncludeRivalryCashback(false);
    await result.current.setIncludeWeeklyEventChestCashback(false);
    await result.current.setIncludeQuestCashback(false);
    await result.current.setOwnedSpendResource(4);
    await result.current.setOwnedWeeklyEventChests(1);
  });

  expect(result.current.rivalryProgress.totalScore).toBe(150);
  expect(result.current.questProgress.sections[0].tasks[0].isComplete).toBe(
    true,
  );
  expect(result.current.questProgress.sections[0].tasks[1].isComplete).toBe(
    false,
  );
  expect(result.current.questProgress.sections[0].isComplete).toBe(false);
});

test("keeps local state and reports a controlled write error", async () => {
  const { result } = renderHook(() =>
    useWeeklyRivalryCalculator(beastlyEchoesConfig),
  );
  await waitFor(() => expect(result.current.isLoaded).toBe(true));
  mockNextSetItemError = new Error("write failed");

  await act(async () => {
    await result.current.setOwnedSpendResource(5);
  });

  expect(result.current.input.ownedSpendResource).toBe(5);
  expect(result.current.storageError).toBe(
    "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  );
});

test("reset clears quantities and disables all cashback switches", async () => {
  const { result } = renderHook(() =>
    useWeeklyRivalryCalculator(beastlyEchoesConfig),
  );
  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  await act(async () => {
    await result.current.setOwnedSpendResource(80);
    await result.current.setOwnedWeeklyEventChests(5);
    await result.current.setIncludeRivalryCashback(true);
    await result.current.setIncludeWeeklyEventChestCashback(true);
    await result.current.setIncludeQuestCashback(true);
    await result.current.setIncludeSharedCashback(true);
    await result.current.reset();
  });

  expect(result.current.input).toEqual({
    ownedSpendResource: 0,
    ownedWeeklyEventChests: 0,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    includeSharedCashback: false,
  });
});

test("persists different event calculators under different keys", async () => {
  const beast = renderHook(() => useWeeklyRivalryCalculator(beastlyEchoesConfig));
  const tower = renderHook(() => useWeeklyRivalryCalculator(towerOfBabelConfig));
  await waitFor(() => {
    expect(beast.result.current.isLoaded).toBe(true);
    expect(tower.result.current.isLoaded).toBe(true);
  });

  await act(async () => {
    await beast.result.current.setOwnedSpendResource(25);
    await tower.result.current.setOwnedSpendResource(50);
  });

  expect(
    JSON.parse(
      mockStorage.get(getWeeklyRivalryStorageKey("beastly-echoes")) ?? "{}",
    ).ownedSpendResource,
  ).toBe(25);
  expect(
    JSON.parse(
      mockStorage.get(getWeeklyRivalryStorageKey("tower-of-babel")) ?? "{}",
    ).ownedSpendResource,
  ).toBe(50);
});
