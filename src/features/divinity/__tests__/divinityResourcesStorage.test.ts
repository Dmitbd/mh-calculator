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
  mockStorage.clear();
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
