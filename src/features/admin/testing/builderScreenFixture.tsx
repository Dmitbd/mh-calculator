import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  HeroBuildSetRepositoryError,
  type HeroBuildSetRecord,
  type HeroBuildSetStatusIds,
} from "@/features/builds";
import { getHeroBuildSet } from "@/features/game-data/heroes";
import type { HeroBuildSet } from "@/features/builds";

import { DivinityBranchBuilderScreen } from "../screens/DivinityBranchBuilderScreen";

export const mockGetSupabaseClient = jest.fn<unknown, []>(() => null);
export const mockFetchHeroBuildSetStatusIds = jest.fn<
  Promise<HeroBuildSetStatusIds>,
  []
>();
export const mockFetchDraftHeroBuildSet = jest.fn();
const mockFetchDraftHeroBuildSetRecord = jest.fn();
const mockFetchPublishedHeroBuildSet = jest.fn();
export const mockFetchPublishedHeroBuildSetRecord = jest.fn();
export const mockLoadPublishedHeroBuildSet = jest.fn();
export const mockCreateOrUpdateDraftHeroBuildSet = jest.fn();
export const mockPublishDraftHeroBuildSet = jest.fn();
export const mockUpdatePublishedHeroBuildSet = jest.fn();
export const mockHeroBuilderSectionProps = jest.fn<void, [Record<string, unknown>]>();
export const mockEquipmentBuilderSectionRender = jest.fn();
export const mockSignInAdmin = jest.fn();
export const mockSignOutAdmin = jest.fn();
export const mockGetCurrentAdminSession = jest.fn();
export const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  replace: jest.fn(),
};
export const ADMIN_SESSION = {
  id: "admin-user-id",
  email: "admin@example.com",
  role: "admin",
} as const;

export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

export function getValidHeroBuildSet(heroId: string): HeroBuildSet {
  const buildSet = JSON.parse(JSON.stringify(getHeroBuildSet(heroId))) as
    | HeroBuildSet
    | null;

  if (!buildSet) {
    throw new Error(`Missing test build set for ${heroId}.`);
  }

  const addRequiredDivinitySkill = (tabs: HeroBuildSet["tabs"]) => {
    tabs.forEach((tab) => {
      if (tab.build) {
        tab.build.divinitySkills = {
          ...tab.build.divinitySkills,
          base: ["asterial-brighten"],
        };
      }

      if (tab.children) {
        addRequiredDivinitySkill(tab.children);
      }
    });
  };

  addRequiredDivinitySkill(buildSet.tabs);

  return buildSet;
}

export function getValidBastetBuildSet(): HeroBuildSet {
  return getValidHeroBuildSet("bastet");
}

export function getBuildSetRecord(
  status: "draft" | "published",
  revision = 1,
): HeroBuildSetRecord {
  return {
    buildSet: getValidBastetBuildSet(),
    revision,
    status,
    updatedAt: "2026-08-13T09:00:00.000Z",
    updatedBy: ADMIN_SESSION.id,
  };
}

export function getPvpOnlyBastetBuildSet(): HeroBuildSet {
  const buildSet = getValidBastetBuildSet();
  const clearBuilds = (tabs: HeroBuildSet["tabs"]) => {
    tabs.forEach((tab) => {
      tab.build = null;

      if (tab.children) {
        clearBuilds(tab.children);
      }
    });
  };

  buildSet.tabs.forEach((tab) => {
    if (tab.id !== "pvp") {
      clearBuilds([tab]);
    }
  });

  return buildSet;
}

jest.mock("@/features/builds", () => {
  const actual = jest.requireActual("@/features/builds");

  return {
    ...actual,
    createOrUpdateDraftHeroBuildSet: (...args: unknown[]) =>
      mockCreateOrUpdateDraftHeroBuildSet(...args),
    fetchDraftHeroBuildSet: (...args: unknown[]) =>
      mockFetchDraftHeroBuildSet(...args),
    fetchDraftHeroBuildSetRecord: (...args: unknown[]) =>
      mockFetchDraftHeroBuildSetRecord(...args),
    fetchHeroBuildSetStatusIds: () => mockFetchHeroBuildSetStatusIds(),
    fetchPublishedHeroBuildSet: (...args: unknown[]) =>
      mockFetchPublishedHeroBuildSet(...args),
    fetchPublishedHeroBuildSetRecord: (...args: unknown[]) =>
      mockFetchPublishedHeroBuildSetRecord(...args),
    getHeroBuildSupabaseClient: () => mockGetSupabaseClient(),
    loadPublishedHeroBuildSet: (...args: unknown[]) =>
      mockLoadPublishedHeroBuildSet(...args),
    publishDraftHeroBuildSet: (...args: unknown[]) =>
      mockPublishDraftHeroBuildSet(...args),
    updatePublishedHeroBuildSet: (...args: unknown[]) =>
      mockUpdatePublishedHeroBuildSet(...args),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  router: {
    back: () => mockRouter.back(),
    canGoBack: () => mockRouter.canGoBack(),
    replace: (href: string) => mockRouter.replace(href),
  },
}));

jest.mock("../components/branch-builder/HeroBuilderSection", () => {
  const actual = jest.requireActual(
    "../components/branch-builder/HeroBuilderSection",
  );

  return {
    ...actual,
    HeroBuilderSection: (props: Record<string, unknown>) => {
      mockHeroBuilderSectionProps(props);
      return actual.HeroBuilderSection(props as never);
    },
  };
});

jest.mock("../components/branch-builder/EquipmentBuilderSection", () => {
  const actual = jest.requireActual(
    "../components/branch-builder/EquipmentBuilderSection",
  );

  return {
    ...actual,
    EquipmentBuilderSection: (props: Record<string, unknown>) => {
      mockEquipmentBuilderSectionRender();
      return actual.EquipmentBuilderSection(props as never);
    },
  };
});

jest.mock("@/features/auth", () => ({
  getCurrentAdminSession: (...args: unknown[]) =>
    mockGetCurrentAdminSession(...args),
  signInAdmin: (...args: unknown[]) => mockSignInAdmin(...args),
  signOutAdmin: (...args: unknown[]) => mockSignOutAdmin(...args),
}));

export function installBuilderScreenTestLifecycle() {
  const originalPlatform = Platform.OS;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: jest.fn(() => true),
      writable: true,
    });
    Object.defineProperty(window, "addEventListener", {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
    Object.defineProperty(window, "removeEventListener", {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
    jest.spyOn(Alert, "alert").mockImplementation(
      (_title, _message, buttons) => {
        buttons?.find((button) => button.text === "Выйти")?.onPress?.();
      },
    );
    mockGetSupabaseClient.mockReturnValue(null);
    mockFetchHeroBuildSetStatusIds.mockReset();
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockReset();
    mockFetchDraftHeroBuildSet.mockResolvedValue(null);
    mockFetchDraftHeroBuildSetRecord.mockReset();
    mockFetchDraftHeroBuildSetRecord.mockImplementation(
      async (_client: unknown, heroId: string) => {
        const buildSet = await mockFetchDraftHeroBuildSet(_client, heroId);
        return buildSet
          ? { ...getBuildSetRecord("draft"), buildSet }
          : null;
      },
    );
    mockFetchPublishedHeroBuildSet.mockReset();
    mockFetchPublishedHeroBuildSet.mockResolvedValue(null);
    mockFetchPublishedHeroBuildSetRecord.mockReset();
    mockLoadPublishedHeroBuildSet.mockReset();
    mockLoadPublishedHeroBuildSet.mockResolvedValue(getValidBastetBuildSet());
    mockFetchPublishedHeroBuildSetRecord.mockImplementation(
      async (client: unknown, heroId: string) => {
        const buildSet = await mockLoadPublishedHeroBuildSet({
          client,
          fallbackBuildSet: getHeroBuildSet(heroId),
          heroId,
        });
        return buildSet
          ? { ...getBuildSetRecord("published"), buildSet }
          : null;
      },
    );
    mockCreateOrUpdateDraftHeroBuildSet.mockReset();
    mockCreateOrUpdateDraftHeroBuildSet.mockResolvedValue(undefined);
    mockPublishDraftHeroBuildSet.mockReset();
    mockPublishDraftHeroBuildSet.mockResolvedValue(undefined);
    mockUpdatePublishedHeroBuildSet.mockReset();
    mockUpdatePublishedHeroBuildSet.mockResolvedValue(undefined);
    mockHeroBuilderSectionProps.mockReset();
    mockEquipmentBuilderSectionRender.mockReset();
    mockSignInAdmin.mockReset();
    mockSignOutAdmin.mockReset();
    mockGetCurrentAdminSession.mockReset();
    mockGetCurrentAdminSession.mockResolvedValue(null);
    mockRouter.back.mockClear();
    mockRouter.canGoBack.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
    mockRouter.replace.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

}

export function renderAdminBuilder() {
    return render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
      />,
    );
}

export { DivinityBranchBuilderScreen };
