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

import {
  loadDivinityProgress,
  resetDivinityProgress,
  saveDivinityProgress,
} from "../storage/divinityProgressStorage";

test("loads the saved current level", async () => {
  mockStorage.clear();
  await saveDivinityProgress({ currentLevel: 3 });

  await expect(loadDivinityProgress()).resolves.toMatchObject({ currentLevel: 3 });
});

test("resets the saved current level", async () => {
  mockStorage.clear();
  await saveDivinityProgress({ currentLevel: 4 });
  await resetDivinityProgress();

  await expect(loadDivinityProgress()).resolves.toMatchObject({ currentLevel: 0 });
});
