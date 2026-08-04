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
  loadAntiqueCalculator,
  resetAntiqueCalculator,
  saveAntiqueCalculator,
} from "../storage/antiqueCalculatorStorage";

const emptyInput = {
  coins: 0,
  templeMapAllocation: 0,
  ownedTombMaps: 0,
  ownedTempleMaps: 0,
};

beforeEach(() => {
  mockStorage.clear();
  mockGetItemError = undefined;
});

test("normalizes missing and malformed calculator storage to an empty record", async () => {
  await expect(loadAntiqueCalculator()).resolves.toMatchObject(emptyInput);

  mockStorage.set("antique-rivalry-calculator", "{not valid JSON");

  await expect(loadAntiqueCalculator()).resolves.toMatchObject(emptyInput);
});

test("returns an empty record when AsyncStorage rejects the read", async () => {
  mockGetItemError = new Error("read failed");

  await expect(loadAntiqueCalculator()).resolves.toMatchObject(emptyInput);
});

test("saves normalized calculator inputs with a clamped temple allocation", async () => {
  await saveAntiqueCalculator({
    coins: "2499",
    templeMapAllocation: 99,
    ownedTombMaps: -1,
    ownedTempleMaps: 4.8,
  });

  await expect(loadAntiqueCalculator()).resolves.toMatchObject({
    coins: 2_499,
    templeMapAllocation: 2,
    ownedTombMaps: 0,
    ownedTempleMaps: 4,
  });
});

test("resets only the antique calculator key", async () => {
  mockStorage.set("divinity-resources", "divinity-sentinel");
  await saveAntiqueCalculator({
    coins: 2_000,
    templeMapAllocation: 2,
    ownedTombMaps: 3,
    ownedTempleMaps: 4,
  });

  await resetAntiqueCalculator();

  await expect(loadAntiqueCalculator()).resolves.toMatchObject(emptyInput);
  expect(mockStorage.get("divinity-resources")).toBe("divinity-sentinel");
});
