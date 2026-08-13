const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockGetSupabaseClient = jest.fn<unknown, []>(() => null);
const mockLoadPublishedHeroBuildSet = jest.fn();
const mockLoadDataBootstrap = jest.fn();
const mockLoadAndCacheRemoteHeroBuildSnapshot = jest.fn();
const mockLoadHeroBuildSnapshotFallback = jest.fn();
const mockAcceptBootstrapTransition = jest.fn();
const mockAcceptResourceTransition = jest.fn();
const mockRejectBootstrapTransition = jest.fn();
const mockRejectResourceTransition = jest.fn();
const mockUseCriticalImagePreload = jest.fn(() => true);
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
const ADMIN_SESSION = {
  id: "admin-user-id",
  email: "admin@example.com",
  role: "admin",
} as const;

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  router: mockRouter,
  useRouter: () => mockRouter,
}));

jest.mock("@/shared/lib/supabaseClient", () => ({
  __esModule: true,
  getSupabaseClient: () => mockGetSupabaseClient(),
}));

jest.mock("@/features/builds", () => {
  const actual = jest.requireActual("@/features/builds");

  return {
    ...actual,
    loadPublishedHeroBuildSet: (...args: unknown[]) =>
      mockLoadPublishedHeroBuildSet(...args),
  };
});

jest.mock("@/features/builds/data/heroBuildSnapshotSource", () => ({
  getBuildSetFromSnapshot: (source: { snapshot: { heroBuilds: Array<{ buildSet: unknown; heroId: string }> } }, heroId: string) =>
    source.snapshot.heroBuilds.find((entry) => entry.heroId === heroId)?.buildSet ?? null,
  loadAndCacheRemoteHeroBuildSnapshot: (...args: unknown[]) =>
    mockLoadAndCacheRemoteHeroBuildSnapshot(...args),
  loadHeroBuildSnapshotFallback: (...args: unknown[]) =>
    mockLoadHeroBuildSnapshotFallback(...args),
}));

jest.mock("@/shared/lib/imagePreload", () => ({
  useCriticalImagePreload: () => mockUseCriticalImagePreload(),
}));

jest.mock("@/shared/lib/dataBootstrap", () => ({
  loadDataBootstrap: (...args: unknown[]) => mockLoadDataBootstrap(...args),
}));

jest.mock("@/shared/lib/sourceSelection", () => {
  const actual = jest.requireActual("@/shared/lib/sourceSelection");
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
import { AccessibilityInfo } from "react-native";

import { getHeroBuildSet } from "@/features/game-data/heroes/heroBuilds";
import {
  HERO_BUILD_REQUEST_TIMEOUT_MS,
  HeroBuildScreen,
} from "@/features/heroes/screens/HeroBuildScreen";
import {
  createHeroBuildLoadState,
  resolveHeroBuildLoadState,
} from "@/features/heroes/model/heroBuildLoading";
import { acceptResource } from "@/shared/lib/sourceSelection";

describe("HeroBuildScreen", () => {
  let diagnostic: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.useRealTimers();
    diagnostic = jest.spyOn(console, "info").mockImplementation();
    consoleError = jest.spyOn(console, "error");
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    mockRouter.back.mockClear();
    mockRouter.canGoBack.mockClear();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    mockGetSupabaseClient.mockReturnValue(null);
    mockLoadPublishedHeroBuildSet.mockReset();
    mockLoadPublishedHeroBuildSet.mockResolvedValue(getHeroBuildSet("bastet"));
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockReset();
    mockLoadAndCacheRemoteHeroBuildSnapshot.mockResolvedValue({
      source: "remote",
      snapshot: {
        heroBuilds: [{ buildSet: getHeroBuildSet("bastet"), heroId: "bastet" }],
      },
    });
    mockLoadHeroBuildSnapshotFallback.mockReset();
    mockLoadHeroBuildSnapshotFallback.mockResolvedValue({
      source: "bundled",
      snapshot: {
        heroBuilds: [{ buildSet: getHeroBuildSet("bastet"), heroId: "bastet" }],
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
    expect(consoleError).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  test("renders only tabs with ready builds for bastet", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select PvE build tab")).toBeTruthy();
    expect(screen.queryByLabelText("Select Кампания build tab")).toBeNull();
    expect(screen.queryByLabelText("Select Боссы build tab")).toBeNull();

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));

    expect(screen.getByLabelText("Select Кампания build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select Боссы build tab")).toBeTruthy();
  });

  test("waits for selected hero metadata before showing the initial build", () => {
    mockUseCriticalImagePreload.mockReturnValue(false);

    const view = render(
      <HeroBuildScreen heroId="bastet" initialAdminSession={null} />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Подготавливаем иконки" }),
    ).toBeTruthy();
    expect(screen.queryByText("Axe of Pangu")).toBeNull();

    mockUseCriticalImagePreload.mockReturnValue(true);
    view.rerender(
      <HeroBuildScreen heroId="bastet" initialAdminSession={null} />,
    );

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });

  test("defaults to the first ready build path", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
    expect(screen.getByText("Навыки божественности")).toBeTruthy();
  });

  test("does not render empty placeholder when only ready tabs are visible", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.queryByText("Билд для этого режима ещё не готов.")).toBeNull();
    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });

  test("shows active weapon color bonus for read-only build with repeated colors", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();
    expect(
      screen.getByText(
        "If any allied frontline Hero is still alive, this Hero's damage taken is reduced by 24%.",
      ),
    ).toBeTruthy();
  });

  test("does not show weapon bonus block when build has no repeated colors", () => {
    const buildSet = getHeroBuildSet("bastet");

    if (!buildSet) {
      throw new Error("Expected bastet build set.");
    }

    const patchedTabs = buildSet.tabs.map((tab) => {
      if (!tab.build) {
        return tab;
      }

      return {
        ...tab,
        build: {
          ...tab.build,
          weaponAwakening: [
            { slot: 1, colorId: "red" },
            { slot: 2, colorId: "yellow" },
            { slot: 3, colorId: "green" },
            { slot: 4, colorId: "blue" },
            { slot: 5, colorId: "purple" },
          ],
        },
      };
    });

    const spy = jest
      .spyOn(require("@/features/game-data/heroes/heroBuilds"), "getHeroBuildSet")
      .mockReturnValue({
        ...buildSet,
        tabs: patchedTabs,
      });

    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.queryByText("Активные бонусы цветов")).toBeNull();

    spy.mockRestore();
  });

  test("hides admin actions for anonymous users", () => {
    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);

    expect(screen.queryByText("Редактировать")).toBeNull();
    expect(screen.queryByText("Удалить")).toBeNull();
  });

  test("opens builder edit mode from the hero screen for admins", () => {
    render(
      <HeroBuildScreen
        heroId="bastet"
        initialAdminSession={ADMIN_SESSION}
      />,
    );

    fireEvent.press(screen.getByText("Редактировать"));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/admin/branch-builder",
      params: { heroId: "bastet", mode: "edit" },
    });
    expect(screen.queryByText("Удалить")).toBeNull();
  });

  test("does not show empty 7-node divinity row in read-only builds", () => {
    const buildSet = getHeroBuildSet("bastet");

    if (!buildSet) {
      throw new Error("Expected bastet build set.");
    }

    const patchedTabs = buildSet.tabs.map((tab) => {
      if (!tab.build) {
        return tab;
      }

      return {
        ...tab,
        build: {
          ...tab.build,
          divinitySkills: {
            base: tab.build.divinitySkills?.base ?? [],
          },
        },
      };
    });

    const spy = jest
      .spyOn(require("@/features/game-data/heroes/heroBuilds"), "getHeroBuildSet")
      .mockReturnValue({
        ...buildSet,
        tabs: patchedTabs,
      });

    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByText("6 узлов")).toBeTruthy();
    expect(screen.queryByText("7 узлов")).toBeNull();

    spy.mockRestore();
  });

  test("shows the shared loader until the initial remote build resolves", async () => {
    let resolveBuild!: (buildSet: ReturnType<typeof getHeroBuildSet>) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadPublishedHeroBuildSet.mockReturnValue(
      new Promise((resolve) => {
        resolveBuild = resolve;
      }),
    );

    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);

    expect(
      screen.getByRole("progressbar", { name: "Загружаем билд" }),
    ).toBeTruthy();
    expect(screen.queryByText("Axe of Pangu")).toBeNull();
    expect(screen.queryByText("Билд для этого режима ещё не готов.")).toBeNull();

    resolveBuild(getHeroBuildSet("bastet"));

    expect(await screen.findByText("Axe of Pangu")).toBeTruthy();
    expect(screen.queryByText("Загружаем билд")).toBeNull();
    expect(mockAcceptBootstrapTransition).toHaveBeenCalled();
    expect(mockAcceptResourceTransition).toHaveBeenCalledWith(
      expect.any(Object),
      "heroBuilds",
      getHeroBuildSet("bastet"),
    );
  });

  test("does not read a published build before compatible bootstrap", async () => {
    let resolveBootstrap!: (decision: typeof remoteBootstrap) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap.mockReturnValue(
      new Promise((resolve) => {
        resolveBootstrap = resolve;
      }),
    );

    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);

    expect(mockLoadPublishedHeroBuildSet).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar", { name: "Загружаем билд" })).toBeTruthy();

    await act(async () => {
      resolveBootstrap(remoteBootstrap);
    });

    expect(mockLoadPublishedHeroBuildSet).toHaveBeenCalledTimes(1);
  });

  test("keeps the bundled build when bootstrap selects fallback", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadDataBootstrap.mockResolvedValue({
      manifest: null,
      reason: "timeout",
      source: "fallback",
    });

    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);

    expect(await screen.findByText("Axe of Pangu")).toBeTruthy();
    expect(mockLoadPublishedHeroBuildSet).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith("Hero build fallback", {
      heroId: "bastet",
      kind: "timeout",
    });
    expect(mockRejectBootstrapTransition).toHaveBeenCalledWith(
      expect.any(Object),
      "timeout",
    );
    expect(mockRejectResourceTransition).toHaveBeenCalledWith(
      expect.any(Object),
      "heroBuilds",
      "timeout",
    );
  });

  test("bounds a hanging hero resource request and ignores its late result", async () => {
    jest.useFakeTimers();
    let resolveRemote!: (buildSet: ReturnType<typeof getHeroBuildSet>) => void;
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadPublishedHeroBuildSet.mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );

    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);
    await act(async () => {
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(HERO_BUILD_REQUEST_TIMEOUT_MS);
    });

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
    expect(diagnostic).toHaveBeenCalledWith("Hero build fallback", {
      heroId: "bastet",
      kind: "timeout",
    });

    await act(async () => {
      resolveRemote(getHeroBuildSet("morana"));
    });

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });

  test("uses the local build when an unexpected initial request error occurs", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadPublishedHeroBuildSet.mockRejectedValue(new Error("unexpected"));

    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);

    expect(await screen.findByText("Axe of Pangu")).toBeTruthy();
    expect(screen.queryByText("Загружаем билд")).toBeNull();
  });

  test("resets build content synchronously when the route hero changes", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadPublishedHeroBuildSet
      .mockResolvedValueOnce(getHeroBuildSet("bastet"))
      .mockReturnValueOnce(new Promise(() => undefined));
    const view = render(
      <HeroBuildScreen heroId="bastet" initialAdminSession={null} />,
    );
    expect(await screen.findByText("Axe of Pangu")).toBeTruthy();

    view.rerender(
      <HeroBuildScreen heroId="morana" initialAdminSession={null} />,
    );

    expect(screen.getByText("Морана")).toBeTruthy();
    expect(screen.queryByText("Axe of Pangu")).toBeNull();
    expect(
      screen.getByRole("progressbar", { name: "Загружаем билд" }),
    ).toBeTruthy();
  });

  test("resolves a build and its valid active path in one state transition", () => {
    const initialState = createHeroBuildLoadState({
      fallbackBuildSet: getHeroBuildSet("bastet"),
      hasRemoteClient: true,
      heroId: "bastet",
    });
    const buildSet = getHeroBuildSet("bastet");

    const resolvedState = resolveHeroBuildLoadState(
      initialState,
      acceptResource(initialState.sourceSelection, "heroBuilds", buildSet),
    );

    expect(resolvedState).toEqual(
      expect.objectContaining({
        activePath: expect.arrayContaining([expect.any(String)]),
        buildSet,
        heroId: "bastet",
        isLoading: false,
      }),
    );
  });

  test("reports a controlled remote fallback kind for diagnostics", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockLoadPublishedHeroBuildSet.mockImplementation(async (params) => {
      params.onFallback?.({ kind: "network" });
      return getHeroBuildSet("bastet");
    });

    render(<HeroBuildScreen heroId="bastet" initialAdminSession={null} />);

    expect(await screen.findByText("Axe of Pangu")).toBeTruthy();
    expect(diagnostic).toHaveBeenCalledWith("Hero build fallback", {
      heroId: "bastet",
      kind: "network",
    });
  });

  test("reports the no-client fallback exactly once per hero load", () => {
    const view = render(
      <HeroBuildScreen heroId="bastet" initialAdminSession={null} />,
    );

    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic).toHaveBeenLastCalledWith("Hero build fallback", {
      heroId: "bastet",
      kind: "not-configured",
    });

    view.rerender(
      <HeroBuildScreen heroId="bastet" initialAdminSession={null} />,
    );
    expect(diagnostic).toHaveBeenCalledTimes(1);

    view.rerender(
      <HeroBuildScreen heroId="morana" initialAdminSession={null} />,
    );
    expect(diagnostic).toHaveBeenCalledTimes(2);
    expect(diagnostic).toHaveBeenLastCalledWith("Hero build fallback", {
      heroId: "morana",
      kind: "not-configured",
    });
  });
});
