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
  createEmptyWeeklyRivalryInput,
  getWeeklyRivalryStorageKey,
  loadWeeklyRivalryCalculator,
  resetWeeklyRivalryCalculator,
  saveWeeklyRivalryCalculator,
} from "../storage/weeklyRivalryStorage";

const EVENT_ID = "beastly-echoes" as const;
const STORAGE_KEY = getWeeklyRivalryStorageKey(EVENT_ID);

beforeEach(() => {
  mockStorage.clear();
  mockGetItemError = undefined;
});

test("normalizes missing, malformed, and rejected reads", async () => {
  const empty = createEmptyWeeklyRivalryInput();
  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject(empty);

  mockStorage.set(STORAGE_KEY, "{invalid");
  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject(empty);

  mockGetItemError = new Error("read failed");
  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject(empty);
});

test("rejects records from an unknown schema version", async () => {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      ownedSpendResource: 99,
      includeSharedCashback: true,
    }),
  );

  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject(
    createEmptyWeeklyRivalryInput(),
  );
});

test.each([
  {
    schemaVersion: 1,
    ownedSpendResource: 99,
    ownedWeeklyEventChests: 0,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    updatedAt: new Date(0).toISOString(),
  },
  {
    schemaVersion: 1,
    ownedSpendResource: "99",
    ownedWeeklyEventChests: 0,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    includeSharedCashback: false,
    updatedAt: new Date(0).toISOString(),
  },
  {
    schemaVersion: 1,
    ownedSpendResource: 99,
    ownedWeeklyEventChests: 0,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    includeSharedCashback: false,
    updatedAt: "not-a-date",
  },
])("rejects an incomplete or invalid v1 record", async (record) => {
  mockStorage.set(STORAGE_KEY, JSON.stringify(record));

  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject(
    createEmptyWeeklyRivalryInput(),
  );
});

test("saves two normalized quantities and four independent toggles", async () => {
  await saveWeeklyRivalryCalculator(EVENT_ID, {
    ownedSpendResource: "12.9",
    ownedWeeklyEventChests: 3.8,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: true,
    includeQuestCashback: false,
    includeSharedCashback: true,
  });

  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject({
    schemaVersion: 1,
    ownedSpendResource: 12,
    ownedWeeklyEventChests: 3,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: true,
    includeQuestCashback: false,
    includeSharedCashback: true,
  });
});

test("reset restores disabled defaults without touching unrelated keys", async () => {
  mockStorage.set("summon-rivalry-calculator:v1", "sentinel");
  await saveWeeklyRivalryCalculator(EVENT_ID, {
    ownedSpendResource: 100,
    ownedWeeklyEventChests: 4,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    includeSharedCashback: true,
  });

  await resetWeeklyRivalryCalculator(EVENT_ID);

  await expect(loadWeeklyRivalryCalculator(EVENT_ID)).resolves.toMatchObject(
    createEmptyWeeklyRivalryInput(),
  );
  expect(mockStorage.get("summon-rivalry-calculator:v1")).toBe("sentinel");
});

test("keeps saved state isolated between weekly events", async () => {
  await saveWeeklyRivalryCalculator("tower-of-babel", {
    ownedSpendResource: 120,
  });
  await saveWeeklyRivalryCalculator("zodiac-map", {
    ownedSpendResource: 40,
  });

  await expect(loadWeeklyRivalryCalculator("tower-of-babel")).resolves.toMatchObject({
    ownedSpendResource: 120,
  });
  await expect(loadWeeklyRivalryCalculator("zodiac-map")).resolves.toMatchObject({
    ownedSpendResource: 40,
  });
});
