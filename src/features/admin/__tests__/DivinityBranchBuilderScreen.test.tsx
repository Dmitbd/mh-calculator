import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import type { HeroBuildSetStatusIds } from "@/features/builds";
import { getHeroBuildSet } from "@/features/game-data/heroes";
import type { HeroBuildSet } from "@/features/game-data/heroes";

import { DivinityBranchBuilderScreen } from "../screens/DivinityBranchBuilderScreen";

const mockGetSupabaseClient = jest.fn<unknown, []>(() => null);
const mockFetchHeroBuildSetStatusIds = jest.fn<
  Promise<HeroBuildSetStatusIds>,
  []
>();
const mockFetchDraftHeroBuildSet = jest.fn();
const mockLoadPublishedHeroBuildSet = jest.fn();
const mockSaveHeroBuildSet = jest.fn();
const mockHeroBuilderSectionProps = jest.fn<void, [Record<string, unknown>]>();
const mockSignInAdmin = jest.fn();
const mockSignOutAdmin = jest.fn();

function getValidBastetBuildSet(): HeroBuildSet {
  const buildSet = JSON.parse(
    JSON.stringify(getHeroBuildSet("bastet")),
  ) as HeroBuildSet;

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

jest.mock("@/features/builds", () => {
  const actual = jest.requireActual("@/features/builds");

  return {
    ...actual,
    fetchDraftHeroBuildSet: (...args: unknown[]) =>
      mockFetchDraftHeroBuildSet(...args),
    fetchHeroBuildSetStatusIds: () => mockFetchHeroBuildSetStatusIds(),
    loadPublishedHeroBuildSet: (...args: unknown[]) =>
      mockLoadPublishedHeroBuildSet(...args),
    saveHeroBuildSet: (...args: unknown[]) => mockSaveHeroBuildSet(...args),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
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

jest.mock("@/shared/lib/supabaseClient", () => ({
  getSupabaseClient: () => mockGetSupabaseClient(),
}));

jest.mock("../api/adminAuthRepository", () => ({
  getCurrentAdminSession: jest.fn(async () => null),
  signInAdmin: (...args: unknown[]) => mockSignInAdmin(...args),
  signOutAdmin: (...args: unknown[]) => mockSignOutAdmin(...args),
}));

describe("DivinityBranchBuilderScreen", () => {
  const originalPlatform = Platform.OS;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockGetSupabaseClient.mockReturnValue(null);
    mockFetchHeroBuildSetStatusIds.mockReset();
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockReset();
    mockFetchDraftHeroBuildSet.mockResolvedValue(null);
    mockLoadPublishedHeroBuildSet.mockReset();
    mockLoadPublishedHeroBuildSet.mockResolvedValue(getValidBastetBuildSet());
    mockSaveHeroBuildSet.mockReset();
    mockSaveHeroBuildSet.mockResolvedValue(undefined);
    mockHeroBuilderSectionProps.mockReset();
    mockSignInAdmin.mockReset();
    mockSignOutAdmin.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    process.env.NODE_ENV = originalNodeEnv;
  });

  function renderAdminBuilder() {
    return render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
      />,
    );
  }

  it("gates the first authenticated hero catalog render behind loading", () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockReturnValue(
      new Promise(() => undefined),
    );

    renderAdminBuilder();

    expect(mockHeroBuilderSectionProps.mock.calls[0][0]).toMatchObject({
      isHeroListLoading: true,
    });
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
  });

  it("loads published ids after authentication and excludes those heroes", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });

    renderAdminBuilder();

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByLabelText("Выбрать героя"));

    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
  });

  it("shows a retry action instead of the unfiltered catalog after load failure", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] });

    renderAdminBuilder();

    expect(
      await screen.findByText(
        "Не удалось загрузить список опубликованных гайдов",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();

    fireEvent.press(screen.getByText("Повторить"));

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByLabelText("Выбрать героя")).toBeTruthy();
  });

  it("refreshes after publication, keeps the selected hero visible, and excludes it in fresh create", async () => {
    let resolveRefresh!: (ids: HeroBuildSetStatusIds) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce({
        draftHeroIds: [],
        publishedHeroIds: ["bastet"],
      });

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    expect(screen.getByLabelText("Герой Бастет выбран")).toBeTruthy();

    fireEvent.press(screen.getByText("Опубликовать"));

    await waitFor(() => expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByText("Загрузка героев")).toBeTruthy();
    expect(screen.queryByLabelText("Герой Бастет выбран")).toBeNull();

    await act(async () => {
      resolveRefresh({ draftHeroIds: [], publishedHeroIds: ["bastet"] });
    });
    expect(await screen.findAllByText("Билд опубликован.")).not.toHaveLength(0);
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();

    view.unmount();
    renderAdminBuilder();

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(3),
    );
    fireEvent.press(screen.getByLabelText("Выбрать героя"));
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
  });

  it("does not refresh published ids after publication fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockRejectedValue(new Error("publication failed"));

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByText("Опубликовать"));

    expect(
      await screen.findAllByText("Ошибка Supabase: publication failed"),
    ).not.toHaveLength(0);
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
  });

  it("does not start a publication catalog refresh after unmount", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByText("Опубликовать"));
    await waitFor(() => expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1));

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    view.unmount();

    try {
      await act(async () => {
        resolveSave();
      });

      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("ignores an older published-id response after a newer refresh", async () => {
    let resolveFirstRequest!: (ids: HeroBuildSetStatusIds) => void;
    let resolveSecondRequest!: (ids: HeroBuildSetStatusIds) => void;
    const client = { from: jest.fn() };

    mockGetSupabaseClient.mockReturnValue(client);
    mockFetchHeroBuildSetStatusIds
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveSecondRequest = resolve;
          }),
      );
    mockSignOutAdmin.mockResolvedValue(undefined);
    mockSignInAdmin.mockResolvedValue({ email: "admin@example.com" });

    renderAdminBuilder();

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      resolveSecondRequest({
        draftHeroIds: [],
        publishedHeroIds: ["bastet"],
      });
    });
    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();

    await act(async () => {
      resolveFirstRequest({ draftHeroIds: [], publishedHeroIds: [] });
    });
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();
  });

  it("gates a new session after signing out from a completed hero list", async () => {
    let resolveSecondRequest!: (ids: HeroBuildSetStatusIds) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveSecondRequest = resolve;
          }),
      );
    mockSignOutAdmin.mockResolvedValue(undefined);
    mockSignInAdmin.mockResolvedValue({ email: "admin@example.com" });

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    expect(screen.getByLabelText("Выбрать героя Бастет")).toBeTruthy();
    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");

    mockHeroBuilderSectionProps.mockClear();
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    expect(mockHeroBuilderSectionProps.mock.calls[0][0]).toMatchObject({
      isHeroListLoading: true,
    });
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();

    await act(async () => {
      resolveSecondRequest({ draftHeroIds: [], publishedHeroIds: [] });
    });
  });

  it("ignores an initial hero-list response that resolves after sign-out", async () => {
    let resolveInitialRequest!: (ids: HeroBuildSetStatusIds) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveInitialRequest = resolve;
          }),
      )
      .mockReturnValueOnce(new Promise(() => undefined));
    mockSignOutAdmin.mockResolvedValue(undefined);
    mockSignInAdmin.mockResolvedValue({ email: "admin@example.com" });

    renderAdminBuilder();

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");
    await act(async () => {
      resolveInitialRequest({
        draftHeroIds: [],
        publishedHeroIds: ["bastet"],
      });
    });

    mockHeroBuilderSectionProps.mockClear();
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    const firstAuthenticatedProps = mockHeroBuilderSectionProps.mock.calls[0][0];
    const firstAuthenticatedHeroes =
      firstAuthenticatedProps.notCreatedHeroes as Array<{ id: string }>;

    expect(firstAuthenticatedProps).toMatchObject({ isHeroListLoading: true });
    expect(firstAuthenticatedHeroes.some((hero) => hero.id === "bastet")).toBe(
      true,
    );
  });

  it("passes separate not-created and unfinished lists to the selector", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: ["morana"],
    });

    renderAdminBuilder();

    await waitFor(() => {
      expect(mockHeroBuilderSectionProps).toHaveBeenLastCalledWith(
        expect.objectContaining({
          notPublishedHeroes: expect.arrayContaining([
            expect.objectContaining({ id: "bastet" }),
          ]),
        }),
      );
    });
    const calls = mockHeroBuilderSectionProps.mock.calls;
    const lastProps = calls[calls.length - 1][0];
    expect(
      (lastProps.notCreatedHeroes as Array<{ id: string }>).some(
        ({ id }) => id === "morana",
      ),
    ).toBe(false);
  });

  it("loads an unfinished hero draft before changing the active builder", async () => {
    const client = { from: jest.fn() };
    mockGetSupabaseClient.mockReturnValue(client);
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockResolvedValue(getValidBastetBuildSet());

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    expect(screen.getByText("Загружаем черновик...")).toBeTruthy();
    expect(mockHeroBuilderSectionProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedHeroId: null }),
    );
    await waitFor(() =>
      expect(mockFetchDraftHeroBuildSet).toHaveBeenCalledWith(client, "bastet"),
    );
    expect(await screen.findAllByText("Черновик загружен.")).not.toHaveLength(0);
    expect(mockHeroBuilderSectionProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedHeroId: "bastet" }),
    );
  });

  it("keeps the current builder state when draft loading fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockRejectedValue(new Error("network down"));

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    expect(
      await screen.findAllByText("Ошибка Supabase: network down"),
    ).not.toHaveLength(0);
    expect(mockHeroBuilderSectionProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedHeroId: null }),
    );
  });

  it("does not start a duplicate request while an unfinished draft is loading", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockReturnValue(new Promise(() => undefined));

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    await waitFor(() =>
      expect(mockFetchDraftHeroBuildSet).toHaveBeenCalledTimes(1),
    );

    const calls = mockHeroBuilderSectionProps.mock.calls;
    const lastProps = calls[calls.length - 1][0];
    act(() => {
      (lastProps.onSelectHero as (heroId: string) => void)("bastet");
    });

    expect(mockFetchDraftHeroBuildSet).toHaveBeenCalledTimes(1);
  });

  it("invalidates an unfinished draft request on logout and allows retry after login", async () => {
    let resolveFirstDraft!: (draft: HeroBuildSet) => void;
    const client = { from: jest.fn() };

    mockGetSupabaseClient.mockReturnValue(client);
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSet>((resolve) => {
            resolveFirstDraft = resolve;
          }),
      )
      .mockResolvedValueOnce(getValidBastetBuildSet());
    mockSignOutAdmin.mockResolvedValue(undefined);
    mockSignInAdmin.mockResolvedValue({ email: "admin@example.com" });

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    expect(screen.getByText("Загружаем черновик...")).toBeTruthy();

    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");
    await act(async () => {
      resolveFirstDraft(getValidBastetBuildSet());
    });

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    await waitFor(() =>
      expect(mockFetchDraftHeroBuildSet).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findAllByText("Черновик загружен.")).not.toHaveLength(0);
  });

  it("does not consume a draft payload that resolves after unmount", async () => {
    let resolveDraft!: (draft: HeroBuildSet) => void;
    let tabsReadCount = 0;
    const draft = getValidBastetBuildSet();
    const tabs = draft.tabs;
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    Object.defineProperty(draft, "tabs", {
      configurable: true,
      get: () => {
        tabsReadCount += 1;
        return tabs;
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockReturnValue(
      new Promise<HeroBuildSet>((resolve) => {
        resolveDraft = resolve;
      }),
    );

    const view = renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    await waitFor(() =>
      expect(mockFetchDraftHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    const renderCountBeforeUnmount = mockHeroBuilderSectionProps.mock.calls.length;
    view.unmount();

    try {
      await act(async () => {
        resolveDraft(draft);
      });

      expect(tabsReadCount).toBe(0);
      expect(mockHeroBuilderSectionProps).toHaveBeenCalledTimes(
        renderCountBeforeUnmount,
      );
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not inspect a draft error that rejects after unmount", async () => {
    let rejectDraft!: (error: Error) => void;
    let messageReadCount = 0;
    const lateError = new Error();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    Object.defineProperty(lateError, "message", {
      configurable: true,
      get: () => {
        messageReadCount += 1;
        return "late draft failure";
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockReturnValue(
      new Promise<HeroBuildSet>((_resolve, reject) => {
        rejectDraft = reject;
      }),
    );

    const view = renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    await waitFor(() =>
      expect(mockFetchDraftHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    const renderCountBeforeUnmount = mockHeroBuilderSectionProps.mock.calls.length;
    view.unmount();

    try {
      await act(async () => {
        rejectDraft(lateError);
      });

      expect(messageReadCount).toBe(0);
      expect(mockHeroBuilderSectionProps).toHaveBeenCalledTimes(
        renderCountBeforeUnmount,
      );
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("invalidates a combined catalog request when the screen unmounts", async () => {
    let rejectCatalog!: (error: Error) => void;
    let messageReadCount = 0;
    const lateError = new Error();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    Object.defineProperty(lateError, "message", {
      configurable: true,
      get: () => {
        messageReadCount += 1;
        return "late catalog failure";
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockReturnValue(
      new Promise<HeroBuildSetStatusIds>((_resolve, reject) => {
        rejectCatalog = reject;
      }),
    );

    const view = renderAdminBuilder();

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    const renderCountBeforeUnmount = mockHeroBuilderSectionProps.mock.calls.length;
    view.unmount();

    try {
      await act(async () => {
        rejectCatalog(lateError);
      });

      expect(messageReadCount).toBe(0);
      expect(mockHeroBuilderSectionProps).toHaveBeenCalledTimes(
        renderCountBeforeUnmount,
      );
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not request a draft for an invalid current tab", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(mockSaveHeroBuildSet).not.toHaveBeenCalled();
  });

  it("saves the newly prepared tab as a partial draft before marking it saved", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByText("Сохранить вкладку"));

    await waitFor(() => {
      expect(mockSaveHeroBuildSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          heroId: "bastet",
          status: "draft",
          buildSet: expect.objectContaining({ schemaVersion: 2 }),
        }),
      );
    });
  });

  it("blocks duplicate save and publication while a tab save is pending", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getByText("Сохраняем...")).toBeTruthy();
    fireEvent.press(screen.getByText("Сохраняем..."));
    fireEvent.press(screen.getByText("Опубликовать"));
    expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });
  });

  it("keeps the editable form when server tab saving fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockRejectedValue(new Error("save failed"));

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    expect(screen.getByLabelText("Remove Air Rune")).toBeTruthy();
    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(
      await screen.findAllByText("Ошибка Supabase: save failed"),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(screen.getByLabelText("Remove Air Rune")).toBeTruthy();
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
  });

  it("reports a persisted stale snapshot without committing it locally", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByText("Сохранить вкладку"));
    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();

    await act(async () => {
      resolveSave();
    });

    expect(
      await screen.findAllByText(
        "Вкладка сохранена на сервере, но форма уже изменилась.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByText("Опубликовать"));
    expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByText("PvP: Сохраните билд для этой вкладки."),
    ).not.toHaveLength(0);
  });

  it("reports a stale form when it changes during catalog refresh", async () => {
    let resolveSave!: () => void;
    let resolveRefresh!: (ids: HeroBuildSetStatusIds) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByText("Сохранить вкладку"));
    await waitFor(() => expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1));

    act(() => {
      resolveSave();
    });
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByText("Сохраняем...")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();

    await act(async () => {
      resolveRefresh({ draftHeroIds: ["bastet"], publishedHeroIds: [] });
    });

    expect(
      await screen.findAllByText(
        "Вкладка сохранена на сервере, но форма уже изменилась.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
  });

  it("keeps stale wording when catalog refresh fails after a form change", async () => {
    let rejectRefresh!: (error: Error) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((_resolve, reject) => {
            rejectRefresh = reject;
          }),
      );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByText("Сохранить вкладку"));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );

    fireEvent.press(screen.getByLabelText("Remove Air Rune"));

    await act(async () => {
      rejectRefresh(new Error("refresh failed"));
    });

    expect(
      await screen.findAllByText(
        "Вкладка сохранена на сервере, но форма уже изменилась.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(
      screen.getByText("Не удалось загрузить список опубликованных гайдов"),
    ).toBeTruthy();
  });

  it("invalidates a pending tab save on logout", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    mockSignOutAdmin.mockResolvedValue(undefined);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByText("Сохранить вкладку"));
    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");

    await act(async () => {
      resolveSave();
    });

    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Выход выполнен.")).toBeTruthy();
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
  });

  it("does not inspect a tab-save error that rejects after unmount", async () => {
    let rejectSave!: (error: Error) => void;
    let messageReadCount = 0;
    const lateError = new Error();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    Object.defineProperty(lateError, "message", {
      configurable: true,
      get: () => {
        messageReadCount += 1;
        return "late save failure";
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockSaveHeroBuildSet.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject;
      }),
    );

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByText("Сохранить вкладку"));
    await waitFor(() => expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(1));
    view.unmount();

    try {
      await act(async () => {
        rejectSave(lateError);
      });

      expect(messageReadCount).toBe(0);
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps the local commit and catalog retry after refresh failure", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockResolvedValue({ draftHeroIds: ["bastet"], publishedHeroIds: [] });

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    fireEvent.press(screen.getByLabelText("Добавить руну"));
    fireEvent.press(screen.getByLabelText("Add Air Rune"));
    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(
      await screen.findAllByText("Вкладка сохранена."),
    ).not.toHaveLength(0);
    expect(
      await screen.findByText(
        "Не удалось загрузить список опубликованных гайдов",
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Повторить"));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(3),
    );

    fireEvent.press(screen.getByText("Опубликовать"));
    await waitFor(() => expect(mockSaveHeroBuildSet).toHaveBeenCalledTimes(2));
  });

  it("renders builder controls and validates an incomplete form", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    const view = renderAdminBuilder();

    expect(screen.getByText("Builder")).toBeTruthy();
    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select PvE build tab")).toBeTruthy();
    expect(await screen.findByLabelText("Выбрать героя")).toBeTruthy();
    expect(screen.getByLabelText("Добавить оружие")).toBeTruthy();
    expect(screen.getByLabelText("Добавить руну")).toBeTruthy();
    expect(screen.getByText("Пробуждение оружия")).toBeTruthy();
    expect(
      screen.getByText("Кликайте по кружку, чтобы менять его цвет."),
    ).toBeTruthy();
    const textNodes = view.UNSAFE_getAllByType(Text);
    const weaponAwakeningTitleIndex = textNodes.findIndex(
      (node) => node.props.children === "Пробуждение оружия",
    );
    const weaponAwakeningDescriptionIndex = textNodes.findIndex(
      (node) =>
        node.props.children === "Кликайте по кружку, чтобы менять его цвет.",
    );

    expect(weaponAwakeningTitleIndex).toBeLessThan(
      weaponAwakeningDescriptionIndex,
    );
    expect(screen.getByText("Навыки божественности")).toBeTruthy();
    expect(
      screen.getByText("Таланты берутся из выбранных в дереве ниже."),
    ).toBeTruthy();
    expect(screen.getByText("7 узлов")).toBeTruthy();
    expect(
      screen.getByLabelText("Добавить навыки для 7 божественных узлов"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("6 узлов: узел 1 пустой"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("6 узлов: узел 6 пустой"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("7 узлов: узел 1 пустой")).toBeNull();
    expect(screen.getByLabelText("Weapon awakening slot 1, empty")).toBeTruthy();
    expect(screen.queryByText("—")).toBeNull();
    expect(
      screen.queryByText("Добавить навыки для 7 божественных узлов"),
    ).toBeNull();
    expect(screen.getAllByLabelText("Choose branch for левая")).toHaveLength(1);
    expect(screen.getAllByLabelText("Choose branch for центр")).toHaveLength(1);
    expect(screen.getAllByLabelText("Choose branch for правая")).toHaveLength(1);
    expect(screen.queryByText("левая")).toBeNull();
    expect(screen.queryByText("центр")).toBeNull();
    expect(screen.queryByText("правая")).toBeNull();
    expect(screen.queryByText("Asterial Skills")).toBeNull();
    expect(screen.queryByText("Psyche Skills")).toBeNull();
    expect(screen.queryByText("Immortality Skills")).toBeNull();
    expect(screen.queryByText("Devoid Skills")).toBeNull();
    expect(screen.queryByText("Primeval Skills")).toBeNull();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getAllByText("Divinity skill level").length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(
      screen.getAllByText("Выберите цвет пробуждения оружия для слота 1.").length,
    ).toBeTruthy();
    expect(screen.getAllByText("Выберите героя из списка.").length).toBeTruthy();
    expect(screen.getAllByText("Выберите оружие.").length).toBeTruthy();
    expect(screen.getAllByText("Выберите руну.").length).toBeTruthy();
    expect(
      screen.getAllByText("Выберите ветку для левой колонки.").length,
    ).toBeTruthy();
    expect(
      screen.getAllByText(
        "Выберите крупный навык для центральной колонки на уровне 1.",
      ).length,
    ).toBeTruthy();
  });

  it("shows current tab validation messages next to related fields", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getAllByText("Выберите героя из списка.")).toHaveLength(1);
    expect(screen.getAllByText("Выберите оружие.")).toHaveLength(1);
    expect(screen.getAllByText("Выберите руну.")).toHaveLength(1);
    expect(
      screen.getAllByText("Выберите цвет пробуждения оружия для слота 1."),
    ).toHaveLength(1);
    expect(
      screen.getAllByText("Выберите ветку для левой колонки."),
    ).toHaveLength(1);
    expect(
      screen.getAllByText("Выберите крупный навык для центральной колонки на уровне 1."),
    ).toHaveLength(1);
  });

  it("shows current form validation errors in the error toast", () => {
    const view = renderAdminBuilder();

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    const toast = view.UNSAFE_getAllByProps({ accessibilityRole: "alert" })[0];
    const validationToastPattern =
      /Выберите героя из списка\.[\s\S]*Выберите оружие\.[\s\S]*Выберите руну\./;

    expect(
      within(toast).getByText(validationToastPattern),
    ).toBeTruthy();
    expect(
      within(toast).queryByText("Сначала исправьте ошибки вкладки."),
    ).toBeNull();
    expect(screen.queryByText("Сначала исправьте ошибки вкладки.")).toBeNull();
    expect(screen.getAllByText(validationToastPattern)).toHaveLength(1);
  });

  it("shows only save tab and publish actions in the builder footer", () => {
    renderAdminBuilder();

    expect(screen.getByText("Сохранить вкладку")).toBeTruthy();
    expect(screen.getByText("Опубликовать")).toBeTruthy();
    expect(screen.queryByText("Скачать полный JSON")).toBeNull();
    expect(screen.queryByText("Загрузить билд")).toBeNull();
    expect(screen.queryByText("Сохранить черновик")).toBeNull();
    expect(screen.queryByText("Удалить билд")).toBeNull();
  });

  it("hides builder controls until admin signs in", () => {
    render(<DivinityBranchBuilderScreen initialAdminSession={null} />);

    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
    expect(screen.queryByLabelText("Select PvP build tab")).toBeNull();
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
  });

  it("shows a loader and success toast when admin signs in", async () => {
    let resolveSignIn!: (session: { email: string }) => void;

    mockGetSupabaseClient.mockReturnValue({ auth: {} });
    mockSignInAdmin.mockImplementation(
      () =>
        new Promise<{ email: string }>((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    render(<DivinityBranchBuilderScreen initialAdminSession={null} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));

    expect(screen.getByLabelText("Загрузка авторизации")).toBeTruthy();
    expect(screen.getByText("Входим...")).toBeTruthy();

    resolveSignIn({ email: "admin@example.com" });

    await waitFor(() => {
      expect(screen.getByText("Вход выполнен.")).toBeTruthy();
    });

    expect(screen.queryByText("Админ вошёл.")).toBeNull();
    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
  });

  it("shows a loader and success toast when admin signs out", async () => {
    let resolveSignOut!: () => void;

    mockGetSupabaseClient.mockReturnValue({ auth: {} });
    mockSignOutAdmin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );

    renderAdminBuilder();

    fireEvent.press(screen.getByText("Выйти"));

    expect(screen.getByLabelText("Загрузка авторизации")).toBeTruthy();
    expect(screen.getByText("Выходим...")).toBeTruthy();

    resolveSignOut();

    await waitFor(() => {
      expect(screen.getByText("Выход выполнен.")).toBeTruthy();
    });

    expect(screen.queryByText("Админ вышел.")).toBeNull();
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
  });

  it("keeps equipment selections independent between target tabs", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Добавить оружие"));
    fireEvent.press(screen.getByLabelText("Add Excalibur"));

    expect(screen.getByText("Excalibur")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));

    expect(screen.queryByText("Excalibur")).toBeNull();

    fireEvent.press(screen.getByLabelText("Select PvP build tab"));

    expect(screen.getByText("Excalibur")).toBeTruthy();
  });

  it("blocks full json download when target tabs are missing", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Опубликовать"));

    expect(
      screen.getAllByText("PvP: Сохраните билд для этой вкладки.").length,
    ).toBeTruthy();
    expect(
      screen.getAllByText("PvE -> Боссы: Сохраните билд для этой вкладки.").length,
    ).toBeTruthy();
    expect(
      screen.getAllByText("PvE -> Кампания: Сохраните билд для этой вкладки.").length,
    ).toBeTruthy();
  });

  it("shows full export target tab errors above the target tabs", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Опубликовать"));

    expect(
      screen.getAllByText("PvP: Сохраните билд для этой вкладки."),
    ).toHaveLength(1);
    expect(
      screen.getAllByText("PvE -> Боссы: Сохраните билд для этой вкладки."),
    ).toHaveLength(1);
    expect(
      screen.getAllByText("PvE -> Кампания: Сохраните билд для этой вкладки."),
    ).toHaveLength(1);
  });

  it("scrolls to the top when full export has target tab errors", () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, "scrollTo");

    renderAdminBuilder();

    fireEvent.press(screen.getByText("Опубликовать"));

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: true, y: 0 });

    scrollToSpy.mockRestore();
  });

  it("scrolls to the first invalid current tab field when saving a tab", () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, "scrollTo");

    renderAdminBuilder();

    fireEvent(screen.getByTestId("branch-builder-hero-section"), "layout", {
      nativeEvent: {
        layout: { height: 90, width: 320, x: 0, y: 260 },
      },
    });
    fireEvent(screen.getByTestId("branch-builder-download-section"), "layout", {
      nativeEvent: {
        layout: { height: 120, width: 320, x: 0, y: 2200 },
      },
    });

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: true, y: 170 });

    scrollToSpy.mockRestore();
  });

  it("clears fixed field errors while the form is being filled", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getAllByText("Выберите героя из списка.")).toHaveLength(1);

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    expect(screen.queryByText("Выберите героя из списка.")).toBeNull();
    expect(screen.getAllByText("Выберите оружие.")).toHaveLength(1);
  });

  it("selects branch types from the grid column headers", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    expect(screen.getByText("Psyche Skills")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));

    expect(screen.getByText("Psyche Skills")).toBeTruthy();
    expect(screen.getByLabelText("Psyche Skills icon")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));

    expect(screen.getByText("Energy Bubble")).toBeTruthy();
    expect(screen.queryByText("Maestro")).toBeNull();
    expect(screen.queryByText("Gemini")).toBeNull();
  });

  it("asks to select tree talents before opening divinity skill options", () => {
    renderAdminBuilder();

    const slot = screen.getByLabelText(
      "Выбрать навык божественности 6 узлов, слот 1",
    );

    fireEvent.press(slot);

    expect(
      screen.getByText("Выберите хотя бы один талант в дереве ниже."),
    ).toBeTruthy();
    expect(StyleSheet.flatten(slot.props.style).borderColor).not.toBe("#f0c36a");
    expect(screen.queryByText("Aurora")).toBeNull();
  });

  it("shows only selected tree talents in divinity skill options", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );

    expect(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByLabelText("Выбрать навык божественности Gemini").props.style,
      ),
    ).toMatchObject({
      alignItems: "center",
      flexDirection: "column",
      justifyContent: "center",
    });
    expect(screen.getByLabelText("Gemini: узел стоимости 1")).toBeTruthy();
    expect(screen.queryByText("Asterial Skills · 1 уз.")).toBeNull();
    expect(
      screen.queryByLabelText("Очистить навык божественности"),
    ).toBeNull();
    expect(screen.queryByText("Aurora")).toBeNull();
    expect(screen.queryByText("Energy Bubble")).toBeNull();
    expect(
      screen.queryByText(
        "Выберите все 3 ветки дерева, чтобы открыть список навыков божественности.",
      ),
    ).toBeNull();
  });

  it("adds each selected tree talent to divinity skill options", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));
    fireEvent.press(screen.getByLabelText("Select Energy Bubble for center level 1"));
    fireEvent.press(screen.getByLabelText("Choose branch for правая"));
    fireEvent.press(screen.getByLabelText("Select Immortality Skills for правая"));
    fireEvent.press(screen.getByLabelText("Choose skill for right level 3"));
    fireEvent.press(screen.getByLabelText("Select Eterna for right level 3"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );

    expect(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Выбрать навык божественности Energy Bubble"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Выбрать навык божественности Eterna"),
    ).toBeTruthy();
    expect(screen.queryByText("Aurora")).toBeNull();
    expect(screen.queryByText("Animus")).toBeNull();
  });

  it("fills divinity node diamonds as skills are selected", () => {
    const view = renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    );

    expect(screen.getByLabelText("6 узлов: узел 1 заполнен")).toBeTruthy();
    expect(screen.getByLabelText("6 узлов: узел 2 пустой")).toBeTruthy();
    const filledNode = screen.getByLabelText("6 узлов: узел 1 заполнен");
    const filledNodeStyle = StyleSheet.flatten(filledNode.props.style);
    const nodeBudgetStyles = view.UNSAFE_getAllByType(View)
      .map((node) => StyleSheet.flatten(node.props.style))
      .filter((style) => style?.gap === 12 && style.marginTop === 4);

    expect(filledNodeStyle.width).toBe(14);
    expect(filledNodeStyle.height).toBe(14);
    expect(nodeBudgetStyles.length).toBeGreaterThan(0);

    fireEvent.press(
      screen.getByLabelText("Добавить навыки для 7 божественных узлов"),
    );

    expect(screen.getByLabelText("7 узлов: узел 1 пустой")).toBeTruthy();
    expect(screen.getByLabelText("7 узлов: узел 7 пустой")).toBeTruthy();
  });

  it("validates divinity skill node budgets when selecting skills", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Energy Bubble for left level 3"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 10"));
    fireEvent.press(screen.getByLabelText("Select Maestro for left level 10"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 15"));
    fireEvent.press(screen.getByLabelText("Select Deftness for left level 15"));
    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for центр"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));
    fireEvent.press(screen.getByLabelText("Select Brighten for center level 1"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 7"));
    fireEvent.press(screen.getByLabelText("Select Annihilation for center level 7"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 13"));
    fireEvent.press(screen.getByLabelText("Select Night for center level 13"));

    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Brighten"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 2"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Deftness"),
    );

    expect(screen.getByLabelText("6 узлов: узел 4 заполнен")).toBeTruthy();
    expect(screen.getByLabelText("6 узлов: узел 5 пустой")).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 3"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Night"),
    );

    expect(
      screen.getByText("Навык не помещается в лимит 6 узлов."),
    ).toBeTruthy();
    expect(screen.getByLabelText("6 узлов: узел 5 пустой")).toBeTruthy();
    expect(
      screen.queryByLabelText(
        "Очистить навык божественности 6 узлов, слот 3",
      ),
    ).toBeNull();

    fireEvent.press(
      screen.getByLabelText("Добавить навыки для 7 божественных узлов"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 7 узлов, слот 1"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Brighten"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 7 узлов, слот 2"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Deftness"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 7 узлов, слот 3"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Night"),
    );

    expect(screen.getByLabelText("7 узлов: узел 7 заполнен")).toBeTruthy();
    expect(
      screen.queryByText("Навык не помещается в лимит 7 узлов."),
    ).toBeNull();
  });

  it("keeps divinity skill validation messages separated from the skill fields", () => {
    renderAdminBuilder();

    const validationBlockStyle = StyleSheet.flatten(
      screen.getByTestId("branch-builder-divinity-skill-errors").props.style,
    );

    expect(validationBlockStyle).toMatchObject({
      marginTop: 8,
      width: "100%",
    });
  });

  it("keeps divinity skill choices unique within each row and clearable by slot", () => {
    const view = renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));

    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    );

    expect(screen.getByLabelText("Gemini: узел стоимости 1")).toBeTruthy();
    expect(screen.queryByText("Asterial Skills · 1 уз.")).toBeNull();
    const centeredCostIndicators = view.UNSAFE_getAllByType(View)
      .map((node) => StyleSheet.flatten(node.props.style))
      .filter((style) => style?.alignSelf === "center" && style.gap === 6);

    expect(centeredCostIndicators.length).toBeGreaterThan(0);
    const slotTextBlocks = view.UNSAFE_getAllByType(View)
      .map((node) => StyleSheet.flatten(node.props.style))
      .filter((style) => style?.minHeight === 34 && style.gap === 8);

    expect(slotTextBlocks.length).toBeGreaterThan(0);

    const clearButton = screen.getByLabelText(
      "Очистить навык божественности 6 узлов, слот 1",
    );
    const clearButtonStyle = StyleSheet.flatten(clearButton.props.style);

    expect(clearButtonStyle.backgroundColor).toBe("transparent");
    expect(clearButtonStyle.borderWidth).toBeUndefined();

    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 2"),
    );

    expect(
      screen.queryByLabelText("Выбрать навык божественности Gemini"),
    ).toBeNull();
    expect(
      screen.getByText("Выберите еще таланты в дереве ниже."),
    ).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Добавить навыки для 7 божественных узлов"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 7 узлов, слот 1"),
    );

    expect(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    ).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Очистить навык божественности 6 узлов, слот 1"),
    );

    expect(screen.getByLabelText("6 узлов: узел 1 пустой")).toBeTruthy();
    expect(
      screen.queryByLabelText("Очистить навык божественности 6 узлов, слот 1"),
    ).toBeNull();
  });

  it("keeps branch connector lines on a single centered axis", () => {
    const view = renderAdminBuilder();
    const branchLines = view.UNSAFE_getAllByType(View)
      .map((node) => StyleSheet.flatten(node.props.style))
      .filter(
        (style) =>
          style?.position === "absolute" &&
          style.backgroundColor === "#4d3524" &&
          style.width === 2,
      );

    expect(branchLines.length).toBeGreaterThan(0);
    branchLines.forEach((style) => {
      expect(style.left).toBe("50%");
      expect(style.marginLeft).toBeUndefined();
      expect(style.transform).toEqual([{ translateX: "-50%" }]);
    });

    const stableGridCells = view.UNSAFE_getAllByType(View)
      .map((node) => StyleSheet.flatten(node.props.style))
      .filter(
        (style) =>
          style?.position === "relative" &&
          style.flex === 1 &&
          style.justifyContent === "center" &&
          style.borderWidth === undefined &&
          style.backgroundColor === undefined,
      );

    expect(stableGridCells.length).toBeGreaterThan(0);
    stableGridCells.forEach((style) => {
      expect(style.flexBasis).toBe(0);
      expect(style.minWidth).toBe(0);
    });

    const levelTen = view.UNSAFE_getAllByType(Text).find(
      (node) => node.props.children === 10,
    );
    const levelTenStyle = StyleSheet.flatten(levelTen?.props.style);

    expect(levelTenStyle.width).toBe(34);
    expect(levelTenStyle.minWidth).toBe(34);
    expect(levelTenStyle.maxWidth).toBe(34);
    expect(levelTenStyle.flexBasis).toBe(34);
  });

  it("does not glow below active branch nodes without an active following node", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));
    fireEvent.press(screen.getByLabelText("Select Energy Bubble for center level 1"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 7"));
    fireEvent.press(screen.getByLabelText("Select Divine-Fire for center level 7"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 13"));
    fireEvent.press(screen.getByLabelText("Select Collective Fervor for center level 13"));
    fireEvent.press(
      screen.getByLabelText("Toggle progress for center level 28"),
    );

    const lowerConnectorStyle = StyleSheet.flatten(
      screen.getByLabelText("center level 28 lower branch connector").props
        .style,
    );
    const upperConnectorStyle = StyleSheet.flatten(
      screen.getByLabelText("center level 28 upper branch connector").props
        .style,
    );

    expect(upperConnectorStyle.backgroundColor).toBe("#f0c36a");
    expect(lowerConnectorStyle.backgroundColor).toBe("#4d3524");
    expect(lowerConnectorStyle.boxShadow).toBeUndefined();
  });

  it("blocks lower branch nodes until previous major skills are selected", () => {
    const view = renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose skill for left level 10"));

    const openMajorToast = view.UNSAFE_getAllByProps({
      accessibilityRole: "alert",
    })[0];

    expect(
      within(openMajorToast).getByText(
        "Сначала выберите навык выше в этой ветке.",
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Toggle progress for left level 11"));

    const toggleToast = view.UNSAFE_getAllByProps({
      accessibilityRole: "alert",
    })[0];

    expect(
      within(toggleToast).getByText(
        "Сначала выберите навык выше в этой ветке.",
      ),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByLabelText("Toggle progress for left level 11").props.style,
      ).backgroundColor,
    ).toBe("#1d130f");
  });

  it("clears column skills and progress when changing the branch type", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Energy Bubble for left level 3"));
    fireEvent.press(screen.getByLabelText("Toggle progress for left level 5"));

    expect(screen.getByText("Energy Bubble")).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByLabelText("Toggle progress for left level 4").props.style,
      ).backgroundColor,
    ).toBe("#3a2810");

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));

    expect(screen.queryByText("Energy Bubble")).toBeNull();
    expect(screen.queryByLabelText("Clear skill for left level 3")).toBeNull();
    expect(
      StyleSheet.flatten(
        screen.getByLabelText("Toggle progress for left level 4").props.style,
      ).backgroundColor,
    ).toBe("#1d130f");
  });

  it("shows a toast when changing a branch clears divinity skills", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));
    fireEvent.press(screen.getByLabelText("Choose branch for правая"));
    fireEvent.press(screen.getByLabelText("Select Immortality Skills for правая"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    );

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Devoid Skills for левая"));

    expect(
      screen.getAllByText("\"Навыки божественности\" были сброшены").length,
    ).toBeTruthy();
  });

  it("prefixes web branch header image paths with the configured base URL", () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    process.env.NODE_ENV = "production";

    const view = renderAdminBuilder();

    const images = view.UNSAFE_getAllByType("img" as never);

    expect(images[0].props.src).toBe("/mh-calculator/img/branches/asterial.png");
  });

  it("shows active weapon bonus when hero is selected and two nodes share a color", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 2, empty"));

    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();
    expect(
      screen.getByText(
        "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
      ),
    ).toBeTruthy();
  });

  it("does not show weapon bonus when only one node of a color is selected", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));

    expect(screen.queryByText("Активные бонусы цветов")).toBeNull();
  });

  it("updates weapon bonuses when another hero is selected from the grid", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 2, empty"));
    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Выбрать героя Королева запада"),
    );

    expect(
      screen.queryByText(
        "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
      ),
    ).toBeNull();
    expect(
      screen.getByText(
        "When healing an ally unit with Health lower than 50%, increases this Hero's Health Bestowal by 3%.",
      ),
    ).toBeTruthy();
  });
});
