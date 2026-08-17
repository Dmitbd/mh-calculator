const mockStorage = new Map<string, string>();
let mockGetItemError: Error | undefined;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (mockGetItemError) {
        throw mockGetItemError;
      }

      return mockStorage.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

import {
  createEmptySummonRivalryInput,
  loadSummonRivalryCalculator,
  resetSummonRivalryCalculator,
  saveSummonRivalryCalculator,
} from "../storage/summonRivalryStorage";

const emptyInput = createEmptySummonRivalryInput();

beforeEach(() => {
  mockStorage.clear();
  mockGetItemError = undefined;
});

test("normalizes missing, malformed, and rejected reads to an empty record", async () => {
  await expect(loadSummonRivalryCalculator()).resolves.toMatchObject(emptyInput);

  mockStorage.set("summon-rivalry-calculator:v1", "{not valid JSON");
  await expect(loadSummonRivalryCalculator()).resolves.toMatchObject(emptyInput);

  mockGetItemError = new Error("read failed");
  await expect(loadSummonRivalryCalculator()).resolves.toMatchObject(emptyInput);
});

test("saves normalized counts, purchase bundles, and cashback preference", async () => {
  await saveSummonRivalryCalculator({
    ownedCommonScrolls: "12.9",
    ownedLimitedScrolls: -1,
    ownedFactionScrolls: 4.8,
    ownedFateCrystals: 2,
    purchasedCommonScrolls: 19,
    purchasedLimitedScrolls: 20,
    purchasedFateCrystals: 31,
    includeCashback: false,
  });

  await expect(loadSummonRivalryCalculator()).resolves.toMatchObject({
    schemaVersion: 1,
    ownedCommonScrolls: 12,
    ownedLimitedScrolls: 0,
    ownedFactionScrolls: 4,
    ownedFateCrystals: 2,
    purchasedCommonScrolls: 10,
    purchasedLimitedScrolls: 20,
    purchasedFateCrystals: 30,
    includeCashback: false,
  });
});

test("defaults a missing cashback preference to enabled", async () => {
  mockStorage.set(
    "summon-rivalry-calculator:v1",
    JSON.stringify({ schemaVersion: 1, ownedCommonScrolls: 1 }),
  );

  await expect(loadSummonRivalryCalculator()).resolves.toMatchObject({
    includeCashback: true,
  });
});

test("reset saves empty input without touching unrelated storage", async () => {
  mockStorage.set("divinity-resources", "sentinel");
  await saveSummonRivalryCalculator({ ownedCommonScrolls: 15 });

  await resetSummonRivalryCalculator();

  await expect(loadSummonRivalryCalculator()).resolves.toMatchObject(emptyInput);
  expect(mockStorage.get("divinity-resources")).toBe("sentinel");
});
