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
  await saveDivinityProgress({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 5,
    filledSegments: 2,
  });

  await expect(loadDivinityProgress()).resolves.toMatchObject({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 5,
    filledSegments: 2,
  });
});

test("resets the saved current level", async () => {
  mockStorage.clear();
  await saveDivinityProgress({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 4,
    filledSegments: 1,
  });
  await resetDivinityProgress();

  await expect(loadDivinityProgress()).resolves.toMatchObject({
    startLevel: 1,
    endLevel: 30,
    currentLevel: 1,
    filledSegments: 0,
  });
});
