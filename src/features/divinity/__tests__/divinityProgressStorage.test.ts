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

import {
  loadDivinityProgress,
  resetDivinityProgress,
  saveDivinityProgress,
} from "../storage/divinityProgressStorage";

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => mockStorage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key: string, value: string) => {
    mockStorage.set(key, value);
  });
});

test("loads the saved current level", async () => {
  await saveDivinityProgress({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 5,
    filledSegments: 2,
    autofillEnabled: true,
  });

  await expect(loadDivinityProgress()).resolves.toMatchObject({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 5,
    filledSegments: 2,
    autofillEnabled: true,
  });
});

test("resets the saved current level", async () => {
  await saveDivinityProgress({
    startLevel: 4,
    endLevel: 8,
    currentLevel: 4,
    filledSegments: 1,
    autofillEnabled: true,
  });
  await resetDivinityProgress();

  await expect(loadDivinityProgress()).resolves.toMatchObject({
    startLevel: 1,
    endLevel: 30,
    currentLevel: 1,
    filledSegments: 0,
    autofillEnabled: false,
  });
});

test("rejects malformed saved JSON without overwriting it", async () => {
  mockStorage.set("divinity-progress", "{broken-json");

  await expect(loadDivinityProgress()).rejects.toBeInstanceOf(SyntaxError);
  expect(mockStorage.get("divinity-progress")).toBe("{broken-json");
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("rejects a syntactically valid progress record with invalid field types", async () => {
  const storedValue = JSON.stringify({ currentLevel: "oops" });
  mockStorage.set("divinity-progress", storedValue);

  await expect(loadDivinityProgress()).rejects.toBeInstanceOf(TypeError);
  expect(mockStorage.get("divinity-progress")).toBe(storedValue);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("propagates a storage read failure", async () => {
  const readError = new Error("storage unavailable");
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(readError);

  await expect(loadDivinityProgress()).rejects.toBe(readError);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test("normalizes a valid partial saved record", async () => {
  mockStorage.set(
    "divinity-progress",
    JSON.stringify({ currentLevel: 7, filledSegments: 2 }),
  );

  await expect(loadDivinityProgress()).resolves.toMatchObject({
    startLevel: 1,
    endLevel: 30,
    currentLevel: 7,
    filledSegments: 2,
    autofillEnabled: false,
  });
});

test("keeps nullable legacy progress fields compatible with defaults", async () => {
  mockStorage.set(
    "divinity-progress",
    JSON.stringify({ currentLevel: null, autofillEnabled: null }),
  );

  await expect(loadDivinityProgress()).resolves.toMatchObject({
    currentLevel: 1,
    autofillEnabled: false,
  });
});
