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
const mockUseCriticalImagePreload = jest.fn(() => true);
const mockLoadDataBootstrap = jest.fn();
const mockLoadAndCacheRemoteHeroBuildSnapshot = jest.fn();
const mockLoadHeroBuildSnapshotFallback = jest.fn();
let mockUseActualHeroBuildSnapshotFallback = false;
const mockAcceptBootstrapTransition = jest.fn();
const mockAcceptResourceTransition = jest.fn();
const mockRejectBootstrapTransition = jest.fn();
const mockRejectResourceTransition = jest.fn();
const remoteBootstrap = {
  manifest: {
    status: "ok",
    contentVersion: "v1",
    contentUpdatedAt: "1970-01-01T00:00:00.000000Z",
    schemaVersion: 1,
    resources: {
      heroBuilds: { version: "v1", etag: `sha256:${"a".repeat(64)}` },
    },
  },
  reason: null,
  source: "remote",
} as const;

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  router: mockRouter,
}));

jest.mock("@/features/builds", () => {
  const actual = jest.requireActual("@/features/builds");
  return {
    ...actual,
    getHeroBuildSupabaseClient: () => mockGetSupabaseClient(),
    loadDataBootstrap: (...args: unknown[]) => mockLoadDataBootstrap(...args),
    loadAndCacheRemoteHeroBuildSnapshot: (...args: unknown[]) =>
      mockLoadAndCacheRemoteHeroBuildSnapshot(...args),
    loadHeroBuildSnapshotFallback: (...args: unknown[]) =>
      mockUseActualHeroBuildSnapshotFallback
        ? actual.loadHeroBuildSnapshotFallback(...args)
        : mockLoadHeroBuildSnapshotFallback(...args),
  };
});

jest.mock("@/shared/lib/imagePreload", () => ({
  useCriticalImagePreload: () => mockUseCriticalImagePreload(),
}));

jest.mock("@/features/heroes/model/sourceSelection", () => {
  const actual = jest.requireActual("@/features/heroes/model/sourceSelection");
  return {
    ...actual,
    acceptBootstrap: (...args: unknown[]) => {
      mockAcceptBootstrapTransition(...args);
      return actual.acceptBootstrap(...args);
    },
    acceptResource: (...args: unknown[]) => {
      mockAcceptResourceTransition(...args);
      return actual.acceptResource(...args);
    },
    rejectBootstrap: (...args: unknown[]) => {
      mockRejectBootstrapTransition(...args);
      return actual.rejectBootstrap(...args);
    },
    rejectResource: (...args: unknown[]) => {
      mockRejectResourceTransition(...args);
      return actual.rejectResource(...args);
    },
  };
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { heroes, heroesWithBuilds } from "@/features/game-data/heroes/heroBuilds";
import {
  createInitialHeroCatalogState,
  HeroSelectScreen,
} from "@/features/heroes/screens/HeroSelectScreen";
import { HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS } from "@/features/builds/storage/heroBuildSnapshotStorage";

function remoteSnapshot(heroIds: string[]) {
  return {
    source: "remote",
    snapshot: { heroBuilds: heroIds.map((heroId) => ({ heroId })) },
  };
}

describe("HeroSelectScreen", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation();
    mockRouter.push.mockClear();
    mockGetSupabaseClient.mockReset();
    mockGetSupabaseClient.mockReturnValue(null);
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockReset();
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockResolvedValue(remoteSnapshot([]));
    mockLoadHeroBuildSnapshotFallback.mockReset();
    mockUseActualHeroBuildSnapshotFallback = false;
    mockLoadHeroBuildSnapshotFallback.mockResolvedValue({
      source: "bundled",
      snapshot: {
        heroBuilds: heroesWithBuilds.map(({ id: heroId }) => ({ heroId })),
      },
    });
    mockLoadDataBootstrap.mockReset();
    mockLoadDataBootstrap.mockResolvedValue(remoteBootstrap);
    mockAcceptBootstrapTransition.mockClear();
    mockAcceptResourceTransition.mockClear();
    mockRejectBootstrapTransition.mockClear();
    mockRejectResourceTransition.mockClear();
    mockUseCriticalImagePreload.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("uses a loader-only state for both static render and initial hydration", async () => {
    expect(
      createInitialHeroCatalogState().selection.resources.heroBuilds.source,
    ).toBe("checking");

    const diagnostic = jest.spyOn(console, "info");
    render(<HeroSelectScreen />);

    expect(await screen.findByText("Бастет")).toBeTruthy();
    expect(diagnostic).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: "hero-builds",
      event: "fallback-selected",
      reason: "not-configured",
      resource: "heroBuilds",
      route: "/heroes",
    });
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
    let resolveSnapshot!: (snapshot: ReturnType<typeof remoteSnapshot>) => void;
    const loadingSnapshot = new Promise((resolve) => {
      resolveSnapshot = resolve;
    });
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockReturnValue(loadingSnapshot);

    render(<HeroSelectScreen />);

    expect(screen.queryByLabelText("Поиск героя")).toBeNull();
    expect(screen.queryByText("Роль")).toBeNull();
    expect(
      screen.getByRole("progressbar", { name: "Загружаем билды" }),
    ).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();

    await waitFor(() => {
      expect(mockLoadAndCacheRemoteHeroBuildSnapshot).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      resolveSnapshot(remoteSnapshot([]));
      await loadingSnapshot;
    });

    await waitFor(() => {
      expect(screen.queryByText("Загружаем билды")).toBeNull();
    });
    expect(screen.queryByText("Бастет")).toBeNull();
    expect(
      screen.getByText("Нет героев с готовыми билдами по выбранным фильтрам."),
    ).toBeTruthy();
  });

  test("does not read the hero resource before compatible bootstrap", async () => {
    let resolveBootstrap!: (decision: typeof remoteBootstrap) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap.mockReturnValue(
      new Promise((resolve) => {
        resolveBootstrap = resolve;
      }),
    );

    render(<HeroSelectScreen />);

    expect(mockLoadDataBootstrap).toHaveBeenCalledTimes(1);
    expect(mockLoadAndCacheRemoteHeroBuildSnapshot).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar", { name: "Загружаем билды" })).toBeTruthy();

    await act(async () => {
      resolveBootstrap(remoteBootstrap);
    });

    expect(mockLoadAndCacheRemoteHeroBuildSnapshot).toHaveBeenCalledTimes(1);
  });

  test("uses only bundled hero builds when bootstrap selects fallback", async () => {
    const diagnostic = jest.spyOn(console, "info").mockImplementation();
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap.mockResolvedValue({
      manifest: null,
      reason: "incompatible-schema",
      source: "fallback",
    });

    render(<HeroSelectScreen />);

    expect(await screen.findByText("Показаны локальные билды.")).toBeTruthy();
    expect(screen.getByText("Бастет")).toBeTruthy();
    expect(mockLoadAndCacheRemoteHeroBuildSnapshot).not.toHaveBeenCalled();
    expect(mockRejectBootstrapTransition).toHaveBeenCalledWith(
      expect.any(Object),
      "incompatible-schema",
    );
    expect(mockRejectResourceTransition).toHaveBeenCalledWith(
      expect.any(Object),
      "heroBuilds",
      "incompatible-schema",
    );
    expect(diagnostic).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: "hero-builds",
      event: "fallback-selected",
      reason: "incompatible-schema",
      resource: "heroBuilds",
      route: "/heroes",
    });
    diagnostic.mockRestore();
  });

  test("rechecks bootstrap on retry before reading the hero resource", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap
      .mockResolvedValueOnce({
        manifest: null,
        reason: "network",
        source: "fallback",
      })
      .mockResolvedValueOnce(remoteBootstrap);
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockResolvedValue(remoteSnapshot(["zeus"]));

    render(<HeroSelectScreen />);
    fireEvent.press(await screen.findByText("Повторить"));

    expect(await screen.findByText("Зевс")).toBeTruthy();
    expect(mockLoadDataBootstrap).toHaveBeenLastCalledWith({ force: true });
    expect(mockLoadAndCacheRemoteHeroBuildSnapshot).toHaveBeenCalledTimes(1);
  });

  test("shows only confirmed remote heroes after the initial check", async () => {
    const remoteOnlyHero = heroes.find(
      (hero) => !heroesWithBuilds.some((withBuild) => withBuild.id === hero.id),
    );
    expect(remoteOnlyHero).toBeDefined();
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockResolvedValue(remoteSnapshot([remoteOnlyHero!.id]));

    render(<HeroSelectScreen />);

    expect(await screen.findByText(remoteOnlyHero!.name.ru)).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();
    expect(mockAcceptBootstrapTransition).toHaveBeenCalled();
    expect(mockAcceptResourceTransition).toHaveBeenCalledWith(
      expect.any(Object),
      "heroBuilds",
      [remoteOnlyHero!.id],
    );
  });

  test("derives catalog ids from the complete snapshot so removed heroes disappear", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockResolvedValue({
      source: "remote",
      snapshot: { heroBuilds: [{ heroId: "bastet" }] },
    });

    render(<HeroSelectScreen />);

    expect(await screen.findByText("Бастет")).toBeTruthy();
    expect(screen.queryByText("Морана")).toBeNull();
  });

  test("uses last-known-good ids before bundled ids on bootstrap failure", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap.mockResolvedValue({
      manifest: null,
      reason: "network",
      source: "fallback",
    });
    mockLoadHeroBuildSnapshotFallback.mockResolvedValue({
      source: "last-known-good",
      snapshot: { heroBuilds: [{ heroId: "morana" }] },
    });

    render(<HeroSelectScreen />);

    expect(await screen.findByText("Морана")).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();
  });

  test("configured bootstrap failure leaves the loader after bounded storage fallback", async () => {
    jest.useFakeTimers();
    mockUseActualHeroBuildSnapshotFallback = true;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap.mockResolvedValue({
      manifest: null,
      reason: "network",
      source: "fallback",
    });
    jest.spyOn(AsyncStorage, "getAllKeys").mockReturnValue(
      new Promise(() => undefined),
    );

    render(<HeroSelectScreen />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    });

    expect(screen.getByText("Бастет")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  test("falls back after a timeout and keeps fallback cards visible during retry", async () => {
    const remoteOnlyHero = heroes.find(
      (hero) => !heroesWithBuilds.some((withBuild) => withBuild.id === hero.id),
    );
    expect(remoteOnlyHero).toBeDefined();
    let resolveRetry!: (snapshot: ReturnType<typeof remoteSnapshot>) => void;
    const retry = new Promise((resolve) => {
      resolveRetry = resolve;
    });
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot
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
      resolveRetry(remoteSnapshot([remoteOnlyHero!.id]));
    });

    expect(await screen.findByText(remoteOnlyHero!.name.ru)).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();
    expect(screen.queryByText("Показаны локальные билды.")).toBeNull();
  });

  test("does not update state after an initial request resolves post-unmount", async () => {
    let resolveSnapshot!: (snapshot: ReturnType<typeof remoteSnapshot>) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockReturnValue(
      new Promise((resolve) => {
        resolveSnapshot = resolve;
      }),
    );
    const view = render(<HeroSelectScreen />);
    view.unmount();

    await act(async () => {
      resolveSnapshot(remoteSnapshot(["bastet"]));
    });
  });

  test("falls back after the snapshot timeout and can retry", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot
      .mockRejectedValueOnce(new Error("snapshot timeout"))
      .mockResolvedValueOnce(remoteSnapshot(["zeus"]));

    render(<HeroSelectScreen />);

    expect(await screen.findByText("Показаны локальные билды.")).toBeTruthy();
    expect(screen.getByText("Бастет")).toBeTruthy();

    fireEvent.press(screen.getByText("Повторить"));

    expect(await screen.findByText("Зевс")).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();

    expect(screen.getByText("Зевс")).toBeTruthy();
    expect(screen.queryByText("Не удалось обновить список билдов.")).toBeNull();
  });

  test("silently cancels a superseded retry and ignores its late failure", async () => {
    let rejectSupersededRequest!: (error: Error) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadAndCacheRemoteHeroBuildSnapshot
      .mockRejectedValueOnce(new Error("initial failure"))
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSupersededRequest = reject;
        }),
      )
      .mockResolvedValueOnce(remoteSnapshot(["zeus"]));

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
      await Promise.resolve();
      retryRequest?.();
    });

    expect(await screen.findByText("Зевс")).toBeTruthy();

    await act(async () => {
      rejectSupersededRequest(new Error("late transport failure"));
    });

    expect(screen.getByText("Зевс")).toBeTruthy();
    expect(screen.queryByText("Не удалось обновить список билдов.")).toBeNull();
  });

});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
