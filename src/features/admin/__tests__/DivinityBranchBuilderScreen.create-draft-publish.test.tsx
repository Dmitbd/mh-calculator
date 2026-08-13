import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeroBuildSetRepositoryError, type HeroBuildSetRecord, type HeroBuildSetStatusIds } from "@/features/builds";
import type { HeroBuildSet } from "@/features/game-data/heroes";

import {
  ADMIN_SESSION,
  createDeferred,
  DivinityBranchBuilderScreen,
  getBuildSetRecord,
  getPvpOnlyBastetBuildSet,
  getValidBastetBuildSet,
  getValidHeroBuildSet,
  installBuilderScreenTestLifecycle,
  mockCreateOrUpdateDraftHeroBuildSet,
  mockEquipmentBuilderSectionRender,
  mockFetchDraftHeroBuildSet,
  mockFetchHeroBuildSetStatusIds,
  mockFetchPublishedHeroBuildSetRecord,
  mockGetCurrentAdminSession,
  mockGetSupabaseClient,
  mockHeroBuilderSectionProps,
  mockLoadPublishedHeroBuildSet,
  mockPublishDraftHeroBuildSet,
  mockRouter,
  mockSignInAdmin,
  mockSignOutAdmin,
  mockUpdatePublishedHeroBuildSet,
  renderAdminBuilder,
} from "../testing/builderScreenFixture";

describe("DivinityBranchBuilderScreen: create-draft-publish", () => {
  installBuilderScreenTestLifecycle();
  it("keeps create draft and publish operations separate", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockResolvedValue(getValidBastetBuildSet());

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    await screen.findAllByText("Черновик загружен.");

    fireEvent.press(screen.getByText("Сохранить вкладку"));
    await waitFor(() =>
      expect(mockCreateOrUpdateDraftHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    await screen.findAllByText("Вкладка сохранена.");
    expect(mockPublishDraftHeroBuildSet).not.toHaveBeenCalled();
    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Опубликовать"));
    await waitFor(() =>
      expect(mockPublishDraftHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();
  });

  it("does not refresh published ids after publication fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockRejectedValue(
      new Error("publication failed"),
    );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

    expect(
      await screen.findAllByText("Ошибка Supabase: publication failed"),
    ).not.toHaveLength(0);
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Обновить")).toBeTruthy();
  });

  it("keeps local edits and shows a controlled revision conflict", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockRejectedValue(
      new HeroBuildSetRepositoryError("conflict", "revision conflict"),
    );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

    expect(
      await screen.findAllByText(
        "Билд изменён в другой сессии. Ваши правки сохранены в форме; загрузите актуальную версию.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByLabelText("Weapon awakening slot 1, Зелёный")).toBeNull();
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Обновить")).toBeTruthy();
  });

  it("reports a catalog refresh failure while keeping the published hero excluded", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: ["bastet"], publishedHeroIds: [] })
      .mockRejectedValueOnce(new Error("refresh failed"));

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

    expect(
      await screen.findAllByText(
        "Билд обновлён, но список героев обновить не удалось.",
      ),
    ).not.toHaveLength(0);
    expect(
      screen.getByText("Не удалось загрузить списки героев"),
    ).toBeTruthy();
    expect(screen.getByText("Повторить")).toBeTruthy();
    const calls = mockHeroBuilderSectionProps.mock.calls;
    const lastProps = calls[calls.length - 1][0];
    expect(lastProps.notCreatedHeroes).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "bastet" })]),
    );
    expect(lastProps.notPublishedHeroes).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "bastet" })]),
    );
  });

  it("accepts the published baseline even when the catalog refresh fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: ["bastet"] })
      .mockRejectedValueOnce(new Error("refresh failed"));

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    await screen.findAllByText(
      "Билд обновлён, но список героев обновить не удалось.",
    );

    fireEvent.press(screen.getByLabelText(/^Weapon awakening slot 1,/));
    fireEvent.press(screen.getByText("Обновить"));
    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(2),
    );
    expect(mockUpdatePublishedHeroBuildSet.mock.calls[1][1]).toEqual(
      expect.objectContaining({ expectedRevision: 2 }),
    );
  });


  it("blocks duplicate publication and tab saving while publication is pending", async () => {
    let resolvePublish!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePublish = resolve;
      }),
    );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    const publishButton = screen.getByText("Обновить");
    act(() => {
      fireEvent.press(publishButton);
      fireEvent.press(publishButton);
      fireEvent.press(publishButton);
    });

    expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1);
    expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ heroId: "bastet" }),
    );

    await act(async () => {
      resolvePublish();
    });
  });

  it("does not start a publication catalog refresh after unmount", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );

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

  it("ignores a late publication after another hero is selected", async () => {
    const publication = createDeferred<HeroBuildSetRecord>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });
    mockUpdatePublishedHeroBuildSet.mockReturnValue(publication.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    expect(screen.getByText("Обновляем...")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    expect(await screen.findByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByText("Обновить")).toBeNull();

    await act(async () => {
      publication.resolve(getBuildSetRecord("published", 2));
    });

    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Билд обновлён.")).toBeNull();
    expect(screen.getByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByText("Обновить")).toBeNull();
  });

  it("ignores a late tab save after another hero is selected", async () => {
    const save = createDeferred<HeroBuildSetRecord>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });
    mockUpdatePublishedHeroBuildSet.mockReturnValue(save.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    expect(screen.getByText("Обновляем...")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    await screen.findByLabelText("Изменить героя: Морана");
    expect(screen.queryByText("Обновить")).toBeNull();

    await act(async () => {
      save.resolve(getBuildSetRecord("published", 2));
    });

    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Билд обновлён.")).toBeNull();
    expect(screen.getByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByText("Обновить")).toBeNull();
  });

  it("does not show a publication result after logout during catalog refresh", async () => {
    let resolveRefresh!: (ids: HeroBuildSetStatusIds) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockImplementationOnce(
        () =>
          new Promise<HeroBuildSetStatusIds>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    mockSignOutAdmin.mockResolvedValue(undefined);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");

    await act(async () => {
      resolveRefresh({ draftHeroIds: [], publishedHeroIds: ["bastet"] });
    });

    expect(screen.getByText("Выход выполнен.")).toBeTruthy();
    expect(screen.queryByText("Билд опубликован.")).toBeNull();
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
    mockSignInAdmin.mockResolvedValue(ADMIN_SESSION);

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
    mockSignInAdmin.mockResolvedValue(ADMIN_SESSION);

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
    mockSignInAdmin.mockResolvedValue(ADMIN_SESSION);

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

    expect(screen.getAllByText("Загружаем черновик...")).toHaveLength(2);
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

  it("locks stale form, tab, save, and publish controls while a different draft loads", async () => {
    const draft = createDeferred<HeroBuildSet>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["morana"],
      publishedHeroIds: ["bastet"],
    });
    mockFetchDraftHeroBuildSet.mockReturnValue(draft.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    const removeRune = screen.getByLabelText("Remove Air Rune");
    const pveTab = screen.getByLabelText("Select PvE build tab");
    const update = screen.getByText("Обновить");

    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    await waitFor(() =>
      expect(screen.getAllByText("Загружаем черновик...")).toHaveLength(2),
    );

    act(() => {
      fireEvent.press(update);
      fireEvent.press(pveTab);
      fireEvent.press(removeRune);
    });

    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(screen.queryByLabelText("Select PvE build tab")).toBeNull();
    expect(screen.queryByText("Обновить")).toBeNull();

    await act(async () => {
      draft.reject(new Error("draft failed"));
    });

    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(await screen.findByLabelText("Remove Air Rune")).toBeTruthy();
    expect(
      screen.getByLabelText("Select PvP build tab").props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it("locks an existing form while a new initial edit entity loads", async () => {
    const routeLoad = createDeferred<HeroBuildSet | null>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet", "morana"],
    });

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    const removeRune = screen.getByLabelText("Remove Air Rune");
    const pveTab = screen.getByLabelText("Select PvE build tab");
    const update = screen.getByText("Обновить");
    mockLoadPublishedHeroBuildSet.mockReturnValueOnce(routeLoad.promise);

    view.rerender(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="morana"
        initialMode="edit"
      />,
    );

    await waitFor(() =>
      expect(mockLoadPublishedHeroBuildSet).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByText("Загружаем билд...")).toBeTruthy();
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(screen.queryByLabelText("Select PvE build tab")).toBeNull();
    expect(screen.queryByText("Обновить")).toBeNull();

    act(() => {
      fireEvent.press(removeRune);
      fireEvent.press(pveTab);
      fireEvent.press(update);
    });

    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();

    await act(async () => {
      routeLoad.reject(new Error("route failed"));
    });

    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(await screen.findByLabelText("Remove Air Rune")).toBeTruthy();
    expect(
      screen.getByLabelText("Select PvP build tab").props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it("keeps the accepted form identity after a new initial edit entity is not found", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    mockLoadPublishedHeroBuildSet.mockResolvedValueOnce(null);

    view.rerender(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="missing-hero"
        initialMode="edit"
      />,
    );

    expect(
      await screen.findAllByText("Билд для редактирования не найден."),
    ).not.toHaveLength(0);
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));

    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    expect(await screen.findAllByText("Билд обновлён.")).not.toHaveLength(0);
    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.queryByText("Обновляем...")).toBeNull();
  });

  it("keeps the accepted form identity after a new initial edit request fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    mockLoadPublishedHeroBuildSet.mockRejectedValueOnce(
      new Error("route failed"),
    );

    view.rerender(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="morana"
        initialMode="edit"
      />,
    );

    expect(
      await screen.findAllByText("Ошибка Supabase: route failed"),
    ).not.toHaveLength(0);
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));

    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    expect(await screen.findAllByText("Билд обновлён.")).not.toHaveLength(0);
    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.queryByText("Обновляем...")).toBeNull();
  });

  it("keeps the accepted form identity when a draft target has no client", async () => {
    const client = { from: jest.fn() };

    mockGetSupabaseClient.mockReturnValue(client);
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["morana"],
      publishedHeroIds: ["bastet"],
    });

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    mockGetSupabaseClient.mockReturnValue(null);
    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(screen.queryByText("Загружаем черновик...")).toBeNull();

    mockGetSupabaseClient.mockReturnValue(client);
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    expect(await screen.findAllByText("Билд обновлён.")).not.toHaveLength(0);
    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.queryByText("Обновляем...")).toBeNull();
  });

  it("keeps the explicit unfinished hero when its draft resolves before the initial edit load", async () => {
    const initialLoad = createDeferred<HeroBuildSet | null>();
    const draftLoad = createDeferred<HeroBuildSet>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["morana"],
      publishedHeroIds: ["bastet"],
    });
    mockLoadPublishedHeroBuildSet.mockReturnValue(initialLoad.promise);
    mockFetchDraftHeroBuildSet.mockReturnValue(draftLoad.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    await act(async () => {
      draftLoad.resolve(getValidHeroBuildSet("morana"));
    });
    expect(await screen.findByLabelText("Изменить героя: Морана")).toBeTruthy();

    await act(async () => {
      initialLoad.resolve(getValidBastetBuildSet());
    });

    expect(screen.getByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByLabelText("Изменить героя: Бастет")).toBeNull();
    expect(screen.queryByText("Билд загружен для редактирования.")).toBeNull();
  });

  it("ignores the initial edit response when it resolves before the explicit draft", async () => {
    const initialLoad = createDeferred<HeroBuildSet | null>();
    const draftLoad = createDeferred<HeroBuildSet>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["morana"],
      publishedHeroIds: ["bastet"],
    });
    mockLoadPublishedHeroBuildSet.mockReturnValue(initialLoad.promise);
    mockFetchDraftHeroBuildSet.mockReturnValue(draftLoad.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    await act(async () => {
      initialLoad.resolve(getValidBastetBuildSet());
    });

    expect(screen.getAllByText("Загружаем черновик...")).toHaveLength(2);
    expect(screen.queryByText("Билд загружен для редактирования.")).toBeNull();

    await act(async () => {
      draftLoad.resolve(getValidHeroBuildSet("morana"));
    });

    expect(await screen.findByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByLabelText("Изменить героя: Бастет")).toBeNull();
  });

  it("ignores a late initial edit error and finally after an explicit draft wins", async () => {
    const initialLoad = createDeferred<HeroBuildSet | null>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["morana"],
      publishedHeroIds: ["bastet"],
    });
    mockLoadPublishedHeroBuildSet.mockReturnValue(initialLoad.promise);
    mockFetchDraftHeroBuildSet.mockResolvedValue(getValidHeroBuildSet("morana"));

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));
    expect(await screen.findByLabelText("Изменить героя: Морана")).toBeTruthy();

    await act(async () => {
      initialLoad.reject(new Error("late initial failure"));
    });

    expect(screen.getByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByText("Ошибка Supabase: late initial failure")).toBeNull();
    expect(screen.queryByText("Загружаем билд...")).toBeNull();
  });

  it("invalidates the initial edit load when a fresh hero is selected", async () => {
    const initialLoad = createDeferred<HeroBuildSet | null>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });
    mockLoadPublishedHeroBuildSet.mockReturnValue(initialLoad.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));
    expect(screen.getByLabelText("Изменить героя: Морана")).toBeTruthy();

    await act(async () => {
      initialLoad.resolve(getValidBastetBuildSet());
    });

    expect(screen.getByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByLabelText("Изменить героя: Бастет")).toBeNull();
    expect(screen.queryByText("Билд загружен для редактирования.")).toBeNull();
  });

  it("does not consume an initial edit payload that resolves after unmount", async () => {
    const initialLoad = createDeferred<HeroBuildSet | null>();
    const buildSet = getValidBastetBuildSet();
    const tabs = buildSet.tabs;
    let tabsReadCount = 0;
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    Object.defineProperty(buildSet, "tabs", {
      configurable: true,
      get: () => {
        tabsReadCount += 1;
        return tabs;
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockLoadPublishedHeroBuildSet.mockReturnValue(initialLoad.promise);

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await waitFor(() =>
      expect(mockLoadPublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    view.unmount();

    try {
      await act(async () => {
        initialLoad.resolve(buildSet);
      });

      expect(tabsReadCount).toBe(0);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not inspect an initial edit error that rejects after unmount", async () => {
    const initialLoad = createDeferred<HeroBuildSet | null>();
    const lateError = new Error();
    let messageReadCount = 0;
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    Object.defineProperty(lateError, "message", {
      configurable: true,
      get: () => {
        messageReadCount += 1;
        return "late initial failure";
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockLoadPublishedHeroBuildSet.mockReturnValue(initialLoad.promise);

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await waitFor(() =>
      expect(mockLoadPublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    view.unmount();

    try {
      await act(async () => {
        initialLoad.reject(lateError);
      });

      expect(messageReadCount).toBe(0);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

});
