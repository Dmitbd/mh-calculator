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
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { StrictMode, type ReactNode } from "react";

import { divinityLevels } from "@/features/game-data/divinity";
import { useDivinityProgress } from "../hooks/useDivinityProgress";

function StrictWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => mockStorage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key: string, value: string) => {
    mockStorage.set(key, value);
  });
});

test("reports ready after loading and applies a valid partial record", async () => {
  mockStorage.set(
    "divinity-progress",
    JSON.stringify({ currentLevel: 7, filledSegments: 2 }),
  );

  const { result } = renderHook(() => useDivinityProgress(divinityLevels));

  await waitFor(() => expect(result.current.isLoaded).toBe(true));

  expect(result.current).toMatchObject({
    loadState: "ready",
    startLevel: 1,
    endLevel: 30,
    currentLevel: 7,
    filledSegments: 2,
  });
});

test("reports an error when the saved progress cannot be parsed", async () => {
  mockStorage.set("divinity-progress", "{broken-json");

  const { result } = renderHook(() => useDivinityProgress(divinityLevels));

  await waitFor(() => expect(result.current.loadState).toBe("error"));
  expect(result.current.isLoaded).toBe(false);
  expect(result.current.isRecoveryPending).toBe(false);
});

test("retries a failed progress load and becomes ready only after it succeeds", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  const { result } = renderHook(() => useDivinityProgress(divinityLevels));
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  let resolveRetry: (value: string) => void = () => undefined;
  const retryRead = new Promise<string>((resolve) => {
    resolveRetry = resolve;
  });
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(retryRead);
  const retryLoad = (
    result.current as typeof result.current & {
      retryLoad?: () => Promise<void>;
    }
  ).retryLoad;

  expect(retryLoad).toBeDefined();
  let retryPromise: Promise<void> | undefined;
  act(() => {
    retryPromise = retryLoad?.();
  });
  expect(result.current).toMatchObject({
    loadState: "error",
    isRecoveryPending: true,
  });

  resolveRetry(JSON.stringify({ currentLevel: 8, filledSegments: 1 }));
  await act(async () => {
    await retryPromise;
  });

  expect(result.current).toMatchObject({
    loadState: "ready",
    isRecoveryPending: false,
    currentLevel: 8,
    filledSegments: 1,
  });
});

test("resets only failed progress and applies the default record", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  mockStorage.set("divinity-resources", "resources-sentinel");
  const { result } = renderHook(() => useDivinityProgress(divinityLevels));
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  const resetAfterError = (
    result.current as typeof result.current & {
      resetProgressAfterLoadError?: () => Promise<void>;
    }
  ).resetProgressAfterLoadError;

  expect(resetAfterError).toBeDefined();
  await act(async () => {
    await resetAfterError?.();
  });

  expect(result.current).toMatchObject({
    loadState: "ready",
    isRecoveryPending: false,
    startLevel: 1,
    endLevel: 30,
    currentLevel: 1,
    filledSegments: 0,
    autofillEnabled: false,
  });
  expect(mockStorage.get("divinity-resources")).toBe("resources-sentinel");
  expect(JSON.parse(mockStorage.get("divinity-progress") ?? "{}")).toMatchObject({
    startLevel: 1,
    endLevel: 30,
    currentLevel: 1,
    filledSegments: 0,
    autofillEnabled: false,
  });
});

test("keeps failed progress recoverable when reset storage rejects", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  const { result } = renderHook(() => useDivinityProgress(divinityLevels));
  await waitFor(() => expect(result.current.loadState).toBe("error"));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("write failed"));

  await act(async () => {
    await result.current.resetProgressAfterLoadError();
  });

  expect(result.current).toMatchObject({
    loadState: "error",
    isRecoveryPending: false,
  });
  expect(mockStorage.get("divinity-progress")).toBe("{broken-json");
});

test("keeps failed progress recoverable when retry rejects", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  const { result } = renderHook(() => useDivinityProgress(divinityLevels));
  await waitFor(() => expect(result.current.loadState).toBe("error"));
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("read failed"));

  await act(async () => {
    await result.current.retryLoad();
  });

  expect(result.current).toMatchObject({
    loadState: "error",
    isRecoveryPending: false,
  });
});

test("runs only one progress recovery operation at a time", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  const { result } = renderHook(() => useDivinityProgress(divinityLevels));
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  let resolveRetry: (value: string) => void = () => undefined;
  const retryRead = new Promise<string>((resolve) => {
    resolveRetry = resolve;
  });
  jest.mocked(AsyncStorage.getItem).mockReturnValue(retryRead);
  jest.mocked(AsyncStorage.getItem).mockClear();
  let firstRetry: Promise<void> | undefined;
  let secondRetry: Promise<void> | undefined;

  act(() => {
    firstRetry = result.current.retryLoad();
    secondRetry = result.current.retryLoad();
  });

  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  resolveRetry(JSON.stringify({ currentLevel: 9 }));
  await act(async () => {
    await Promise.all([firstRetry, secondRetry]);
  });
});

test("recovers after the Strict Mode effect lifecycle", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  const { result } = renderHook(
    () => useDivinityProgress(divinityLevels),
    { wrapper: StrictWrapper },
  );
  await waitFor(() => expect(result.current.loadState).toBe("error"));

  await act(async () => {
    await result.current.resetProgressAfterLoadError();
  });

  expect(result.current.loadState).toBe("ready");
});
