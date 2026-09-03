const mockStorage = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DivinityOwnedResources } from "../model/types";
import {
  loadDivinityResources,
  resetDivinityResources,
  saveDivinityResources,
} from "../storage/divinityResourcesStorage";

const savedResources: DivinityOwnedResources = {
  chestCounts: { "600001": 2, "600076": 3 },
  gemCounts: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => mockStorage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key: string, value: string) => {
    mockStorage.set(key, value);
  });
});

test("saves and loads divinity resources", async () => {
  await saveDivinityResources(savedResources);

  await expect(loadDivinityResources()).resolves.toMatchObject(savedResources);
});

test("resets only divinity resources", async () => {
  mockStorage.set("divinity-progress", "progress-sentinel");
  await saveDivinityResources(savedResources);

  await resetDivinityResources();

  await expect(loadDivinityResources()).resolves.toMatchObject({
    chestCounts: { "600001": 0, "600076": 0 },
    gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  });
  expect(mockStorage.get("divinity-progress")).toBe("progress-sentinel");
});

test("normalizes legacy stored counts into the supported range", async () => {
  mockStorage.set(
    "divinity-resources",
    JSON.stringify({
      chestCounts: { "600001": 1_400, "600076": -2 },
      gemCounts: { 1: 12.8, 7: "broken" },
    }),
  );

  await expect(loadDivinityResources()).resolves.toMatchObject({
    chestCounts: { "600001": 999, "600076": 0 },
    gemCounts: { 1: 12, 7: 0 },
  });
});

test("rejects malformed saved JSON without overwriting it", async () => {
  mockStorage.set("divinity-resources", "{broken-json");

  await expect(loadDivinityResources()).rejects.toBeInstanceOf(SyntaxError);
  expect(mockStorage.get("divinity-resources")).toBe("{broken-json");
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("rejects a syntactically valid resources record with an invalid shape", async () => {
  mockStorage.set("divinity-resources", "[]");

  await expect(loadDivinityResources()).rejects.toBeInstanceOf(TypeError);
  expect(mockStorage.get("divinity-resources")).toBe("[]");
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("propagates a storage read failure", async () => {
  const readError = new Error("storage unavailable");
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(readError);

  await expect(loadDivinityResources()).rejects.toBe(readError);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("normalizes a valid partial saved record", async () => {
  mockStorage.set(
    "divinity-resources",
    JSON.stringify({ chestCounts: { "600001": 4 } }),
  );

  await expect(loadDivinityResources()).resolves.toMatchObject({
    chestCounts: { "600001": 4, "600076": 0 },
    gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  });
});

test("keeps nullable legacy resource fields compatible with empty defaults", async () => {
  mockStorage.set(
    "divinity-resources",
    JSON.stringify({ chestCounts: null, gemCounts: null }),
  );

  await expect(loadDivinityResources()).resolves.toMatchObject({
    chestCounts: { "600001": 0, "600076": 0 },
    gemCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
  });
});
