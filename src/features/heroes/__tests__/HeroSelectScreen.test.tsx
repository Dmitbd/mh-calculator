const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));

const mockRouter = {
  push: jest.fn(),
};
const mockGetSupabaseClient = jest.fn<unknown, []>(() => null);
const mockFetchPublishedHeroIds = jest.fn<Promise<string[]>, [unknown]>();
const mockUseCriticalImagePreload = jest.fn(() => true);

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  router: mockRouter,
}));

jest.mock("@/shared/lib/supabaseClient", () => ({
  getSupabaseClient: () => mockGetSupabaseClient(),
}));

jest.mock("@/features/builds", () => ({
  fetchPublishedHeroIds: (...args: [unknown]) => mockFetchPublishedHeroIds(...args),
}));

jest.mock("@/shared/lib/imagePreload", () => ({
  useCriticalImagePreload: () => mockUseCriticalImagePreload(),
}));

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { heroes, heroesWithBuilds } from "@/features/game-data/heroes/heroBuilds";
import {
  HERO_CATALOG_REQUEST_TIMEOUT_MS,
  HeroSelectScreen,
} from "@/features/heroes/screens/HeroSelectScreen";
import * as boundedRequestModule from "@/shared/lib/boundedRequest";

describe("HeroSelectScreen", () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    mockGetSupabaseClient.mockReset();
    mockGetSupabaseClient.mockReturnValue(null);
    mockFetchPublishedHeroIds.mockReset();
    mockFetchPublishedHeroIds.mockResolvedValue([]);
    mockUseCriticalImagePreload.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("shows Bastet when she has a build", () => {
    render(<HeroSelectScreen />);

    expect(screen.getByText("Бастет")).toBeTruthy();
  });

  test("waits for initial critical images before showing fallback cards", () => {
    mockUseCriticalImagePreload.mockReturnValue(false);

    const view = render(<HeroSelectScreen />);

    expect(
      screen.getByRole("progressbar", { name: "Подготавливаем иконки" }),
    ).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();

    mockUseCriticalImagePreload.mockReturnValue(true);
    view.rerender(<HeroSelectScreen />);

    expect(screen.getByText("Бастет")).toBeTruthy();
  });

  test("does not show heroes from master catalog without builds", () => {
    render(<HeroSelectScreen />);

    const heroWithoutBuild = heroes.find(
      (hero) => !heroesWithBuilds.some((withBuild) => withBuild.id === hero.id),
    );

    expect(heroWithoutBuild).toBeDefined();
    expect(screen.queryByText(heroWithoutBuild!.name.ru)).toBeNull();
  });

  test("filters reduce the visible list", () => {
    render(<HeroSelectScreen />);

    fireEvent.changeText(screen.getByLabelText("Поиск героя"), "зевс");

    expect(screen.queryByText("Бастет")).toBeNull();
    expect(screen.getByText("Нет героев с готовыми билдами по выбранным фильтрам.")).toBeTruthy();
  });

  test("shows empty state when filters match no build-ready heroes", () => {
    render(<HeroSelectScreen />);

    fireEvent.changeText(screen.getByLabelText("Поиск героя"), "zzzz-not-found");

    expect(
      screen.getByText("Нет героев с готовыми билдами по выбранным фильтрам."),
    ).toBeTruthy();
  });

  test("keeps catalog controls and cards hidden until the initial source is accepted", async () => {
    let resolveHeroIds!: (heroIds: string[]) => void;
    const loadingHeroIds = new Promise<string[]>((resolve) => {
      resolveHeroIds = resolve;
    });
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds.mockReturnValue(loadingHeroIds);

    render(<HeroSelectScreen />);

    expect(screen.queryByLabelText("Поиск героя")).toBeNull();
    expect(screen.queryByText("Роль")).toBeNull();
    expect(
      screen.getByRole("progressbar", { name: "Загружаем билды" }),
    ).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();

    resolveHeroIds([]);

    await waitFor(() => {
      expect(screen.queryByText("Загружаем билды")).toBeNull();
    });
    expect(screen.queryByText("Бастет")).toBeNull();
    expect(
      screen.getByText("Нет героев с готовыми билдами по выбранным фильтрам."),
    ).toBeTruthy();
  });

  test("shows only confirmed remote heroes after the initial check", async () => {
    const remoteOnlyHero = heroes.find(
      (hero) => !heroesWithBuilds.some((withBuild) => withBuild.id === hero.id),
    );
    expect(remoteOnlyHero).toBeDefined();
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds.mockResolvedValue([remoteOnlyHero!.id]);

    render(<HeroSelectScreen />);

    expect(await screen.findByText(remoteOnlyHero!.name.ru)).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();
  });

  test("falls back after a timeout and keeps fallback cards visible during retry", async () => {
    const remoteOnlyHero = heroes.find(
      (hero) => !heroesWithBuilds.some((withBuild) => withBuild.id === hero.id),
    );
    expect(remoteOnlyHero).toBeDefined();
    let resolveRetry!: (heroIds: string[]) => void;
    const retry = new Promise<string[]>((resolve) => {
      resolveRetry = resolve;
    });
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds
      .mockRejectedValueOnce(new Error("timeout"))
      .mockReturnValueOnce(retry);

    render(<HeroSelectScreen />);

    expect(await screen.findByText("Показаны локальные билды.")).toBeTruthy();
    expect(screen.getByText("Бастет")).toBeTruthy();

    fireEvent.press(screen.getByText("Повторить"));

    expect(screen.getByText("Бастет")).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Обновляем список билдов" }),
    ).toBeTruthy();

    await act(async () => {
      resolveRetry([remoteOnlyHero!.id]);
    });

    expect(await screen.findByText(remoteOnlyHero!.name.ru)).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();
    expect(screen.queryByText("Показаны локальные билды.")).toBeNull();
  });

  test("does not update state after an initial request resolves post-unmount", async () => {
    let resolveHeroIds!: (heroIds: string[]) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds.mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveHeroIds = resolve;
      }),
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation();

    const view = render(<HeroSelectScreen />);
    view.unmount();

    await act(async () => {
      resolveHeroIds(["bastet"]);
    });

    expect(consoleError).not.toHaveBeenCalled();
  });

  test("falls back after the bounded request timeout and can retry", async () => {
    jest.useFakeTimers();
    let resolveFirstRequest!: (heroIds: string[]) => void;
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstRequest = resolve;
        }),
      )
      .mockResolvedValueOnce(["zeus"]);

    render(<HeroSelectScreen />);

    await act(async () => {
      jest.advanceTimersByTime(HERO_CATALOG_REQUEST_TIMEOUT_MS);
    });

    expect(screen.getByText("Показаны локальные билды.")).toBeTruthy();
    expect(screen.getByText("Бастет")).toBeTruthy();

    fireEvent.press(screen.getByText("Повторить"));

    expect(await screen.findByText("Зевс")).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();

    await act(async () => {
      resolveFirstRequest(["bastet"]);
    });

    expect(screen.getByText("Зевс")).toBeTruthy();
    expect(screen.queryByText("Не удалось обновить список билдов.")).toBeNull();
  });

  test("silently cancels a superseded retry and ignores its late failure", async () => {
    let rejectSupersededRequest!: (error: Error) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds
      .mockRejectedValueOnce(new Error("initial failure"))
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSupersededRequest = reject;
        }),
      )
      .mockResolvedValueOnce(["zeus"]);

    render(<HeroSelectScreen />);

    const retry = await screen.findByText("Повторить");
    let retryButton = retry.parent;

    while (retryButton && typeof retryButton.props.onPress !== "function") {
      retryButton = retryButton.parent;
    }

    const retryRequest = retryButton?.props.onPress as (() => void) | undefined;

    expect(retryRequest).toEqual(expect.any(Function));

    await act(async () => {
      retryRequest?.();
      retryRequest?.();
    });

    expect(await screen.findByText("Зевс")).toBeTruthy();

    await act(async () => {
      rejectSupersededRequest(new Error("late transport failure"));
    });

    expect(screen.getByText("Зевс")).toBeTruthy();
    expect(screen.queryByText("Не удалось обновить список билдов.")).toBeNull();
  });

  test("settles a cancelled bounded request with a typed outcome", async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    let rejectRequest!: (error: Error) => void;
    const boundedRequest = boundedRequestModule.createBoundedRequest(
      new Promise<string[]>((_resolve, reject) => {
        rejectRequest = reject;
      }),
      HERO_CATALOG_REQUEST_TIMEOUT_MS,
    );
    const outcome = boundedRequest.promise.catch((error: unknown) => error);

    expect(jest.getTimerCount()).toBe(1);

    boundedRequest.cancel();
    boundedRequest.cancel();

    expect(jest.getTimerCount()).toBe(0);
    await expect(outcome).resolves.toEqual(
      expect.objectContaining({
        code: "BOUNDED_REQUEST_CANCELLED",
        name: "BoundedRequestCancelledError",
      }),
    );
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    rejectRequest(new Error("late transport failure"));
    await Promise.resolve();

    await expect(outcome).resolves.toEqual(
      expect.objectContaining({ code: "BOUNDED_REQUEST_CANCELLED" }),
    );
  });

  test("settles and clears the active catalog request on unmount", async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    const createBoundedRequest = boundedRequestModule.createBoundedRequest;
    let requestOutcome: Promise<unknown> | null = null;
    jest
      .spyOn(boundedRequestModule, "createBoundedRequest")
      .mockImplementation((request, timeoutMs) => {
        const boundedRequest = createBoundedRequest(request, timeoutMs);
        requestOutcome = boundedRequest.promise.catch((error: unknown) => error);
        return boundedRequest;
      });
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds.mockReturnValue(
      new Promise(() => undefined),
    );

    const view = render(<HeroSelectScreen />);
    const catalogTimerCallIndex = setTimeoutSpy.mock.calls.findIndex(
      (call) => call[1] === HERO_CATALOG_REQUEST_TIMEOUT_MS,
    );
    const catalogTimerId = setTimeoutSpy.mock.results[catalogTimerCallIndex]?.value;

    expect(catalogTimerCallIndex).toBeGreaterThanOrEqual(0);

    view.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(catalogTimerId);
    await expect(requestOutcome).resolves.toEqual(
      expect.objectContaining({ code: "BOUNDED_REQUEST_CANCELLED" }),
    );
  });
});
