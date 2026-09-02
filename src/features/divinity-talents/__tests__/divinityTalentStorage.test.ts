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
  loadDivinityTalentSelections,
  resetDivinityTalentSelections,
  saveDivinityTalentSelections,
} from "../storage/divinityTalentStorage";

const STORAGE_KEY = "divinity-talents:v1";
const EMPTY_SELECTIONS = {
  left: null,
  center: null,
  right: null,
};
const VALID_UPDATED_AT = "2026-09-01T10:20:30.000Z";

beforeEach(() => {
  mockStorage.clear();
  mockGetItemError = undefined;
  jest.useRealTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

function writeStoredRecord(value: unknown) {
  mockStorage.set(STORAGE_KEY, JSON.stringify(value));
}

test("missing storage returns a fresh all-null selection record", async () => {
  const first = await loadDivinityTalentSelections();
  const second = await loadDivinityTalentSelections();

  expect(first.selections).toEqual(EMPTY_SELECTIONS);
  expect(second.selections).toEqual(EMPTY_SELECTIONS);
  expect(first.selections).not.toBe(second.selections);
});

test("restores awaitingB and complete phases without changing their endpoints", async () => {
  writeStoredRecord({
    schemaVersion: 1,
    selections: {
      left: { a: 3, b: 3, phase: "awaitingB" },
      center: { a: 1, b: 2, phase: "complete" },
      right: null,
    },
    updatedAt: VALID_UPDATED_AT,
  });

  await expect(loadDivinityTalentSelections()).resolves.toEqual({
    schemaVersion: 1,
    selections: {
      left: { a: 3, b: 3, phase: "awaitingB" },
      center: { a: 1, b: 2, phase: "complete" },
      right: null,
    },
    updatedAt: VALID_UPDATED_AT,
  });
});

test("normalizes awaitingB with different endpoints to all-null selections", async () => {
  writeStoredRecord({
    schemaVersion: 1,
    selections: {
      left: { a: 3, b: 4, phase: "awaitingB" },
      center: null,
      right: null,
    },
    updatedAt: VALID_UPDATED_AT,
  });

  await expect(loadDivinityTalentSelections()).resolves.toMatchObject({
    schemaVersion: 1,
    selections: EMPTY_SELECTIONS,
  });
});

test.each([
  ["null record", null],
  [
    "unknown schema",
    {
      schemaVersion: 2,
      selections: EMPTY_SELECTIONS,
      updatedAt: VALID_UPDATED_AT,
    },
  ],
  [
    "missing branch",
    {
      schemaVersion: 1,
      selections: { left: null, center: null },
      updatedAt: VALID_UPDATED_AT,
    },
  ],
  [
    "unknown branch",
    {
      schemaVersion: 1,
      selections: { ...EMPTY_SELECTIONS, fourth: null },
      updatedAt: VALID_UPDATED_AT,
    },
  ],
  [
    "endpoint absent from its branch",
    {
      schemaVersion: 1,
      selections: {
        ...EMPTY_SELECTIONS,
        left: { a: 1, b: 3, phase: "complete" },
      },
      updatedAt: VALID_UPDATED_AT,
    },
  ],
  [
    "fractional endpoint",
    {
      schemaVersion: 1,
      selections: {
        ...EMPTY_SELECTIONS,
        right: { a: 3, b: 4.5, phase: "complete" },
      },
      updatedAt: VALID_UPDATED_AT,
    },
  ],
  [
    "invalid phase",
    {
      schemaVersion: 1,
      selections: {
        ...EMPTY_SELECTIONS,
        center: { a: 1, b: 2, phase: "finished" },
      },
      updatedAt: VALID_UPDATED_AT,
    },
  ],
  [
    "noncanonical timestamp",
    {
      schemaVersion: 1,
      selections: EMPTY_SELECTIONS,
      updatedAt: "2026-09-01T10:20:30Z",
    },
  ],
])("normalizes %s to all-null selections", async (_label, record) => {
  writeStoredRecord(record);

  await expect(loadDivinityTalentSelections()).resolves.toMatchObject({
    schemaVersion: 1,
    selections: EMPTY_SELECTIONS,
  });
});

test("normalizes malformed JSON to all-null selections", async () => {
  mockStorage.set(STORAGE_KEY, "{not valid JSON");

  await expect(loadDivinityTalentSelections()).resolves.toMatchObject({
    schemaVersion: 1,
    selections: EMPTY_SELECTIONS,
  });
});

test("normalizes a failed read to all-null selections", async () => {
  mockGetItemError = new Error("read failed");

  await expect(loadDivinityTalentSelections()).resolves.toMatchObject({
    schemaVersion: 1,
    selections: EMPTY_SELECTIONS,
  });
});

test("saves schema version, selections and a canonical timestamp under the v1 key", async () => {
  jest.useFakeTimers().setSystemTime(new Date(VALID_UPDATED_AT));
  const selections = {
    left: { a: 3, b: 7, phase: "complete" as const },
    center: { a: 1, b: 1, phase: "awaitingB" as const },
    right: null,
  };

  await saveDivinityTalentSelections(selections);

  expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? "null")).toEqual({
    schemaVersion: 1,
    selections,
    updatedAt: VALID_UPDATED_AT,
  });
});

test("reset writes all-null selections and preserves unrelated keys", async () => {
  mockStorage.set("unrelated-calculator", "sentinel");
  await saveDivinityTalentSelections({
    left: { a: 3, b: 8, phase: "complete" },
    center: null,
    right: null,
  });

  await resetDivinityTalentSelections();

  expect(JSON.parse(mockStorage.get(STORAGE_KEY) ?? "null")).toMatchObject({
    schemaVersion: 1,
    selections: EMPTY_SELECTIONS,
  });
  expect(mockStorage.get("unrelated-calculator")).toBe("sentinel");
});
