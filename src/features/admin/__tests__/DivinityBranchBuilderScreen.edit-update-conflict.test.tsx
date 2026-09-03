jest.mock("@/shared/ui/useImageLoadingTransition", () => ({
  useImageLoadingTransition: () => ({
    handleError: jest.fn(),
    handleLoad: jest.fn(),
    phase: "pending",
    prefersReducedMotion: true,
  }),
}));

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeroBuildSetRepositoryError, type HeroBuildSetRecord, type HeroBuildSetStatusIds } from "@/features/builds";
import type { HeroBuildSet } from "@/features/builds";

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

describe("DivinityBranchBuilderScreen: edit-update-conflict", () => {
  installBuilderScreenTestLifecycle();
  it("restores a true one-leaf draft and keeps publication blocked for missing PvE leaves", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: ["bastet"],
      publishedHeroIds: [],
    });
    mockFetchDraftHeroBuildSet.mockResolvedValue(getPvpOnlyBastetBuildSet());

    renderAdminBuilder();

    fireEvent.press(await screen.findByLabelText("Выбрать героя"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    expect(await screen.findByLabelText("Remove Air Rune")).toBeTruthy();
    expect(
      screen.getByLabelText("Select PvP build tab").props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));

    fireEvent.press(screen.getByText("Опубликовать"));

    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();
    expect(
      screen.getAllByText("PvE -> Боссы: Сохраните билд для этой вкладки.")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("PvE -> Кампания: Сохраните билд для этой вкладки.")
        .length,
    ).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));

    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(screen.getByLabelText("Добавить оружие")).toBeTruthy();
    expect(screen.getByLabelText("Добавить руну")).toBeTruthy();
    expect(
      screen.getByLabelText("Select Боссы build tab").props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
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
    mockSignInAdmin.mockResolvedValue(ADMIN_SESSION);

    renderAdminBuilder();

    fireEvent.press(
      await screen.findByLabelText(
        "Выбрать героя",
        {},
        { timeout: 5_000 },
      ),
    );
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    expect(screen.getAllByText("Загружаем черновик...")).toHaveLength(2);

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
  }, 15_000);

  it("does not consume a draft payload that resolves after unmount", async () => {
    let resolveDraft!: (draft: HeroBuildSet) => void;
    let tabsReadCount = 0;
    const draft = getValidBastetBuildSet();
    const tabs = draft.tabs;
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

    await act(async () => {
      resolveDraft(draft);
    });

    expect(tabsReadCount).toBe(0);
    expect(mockHeroBuilderSectionProps).toHaveBeenCalledTimes(
      renderCountBeforeUnmount,
    );
  });

  it("does not inspect a draft error that rejects after unmount", async () => {
    let rejectDraft!: (error: Error) => void;
    let messageReadCount = 0;
    const lateError = new Error();
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

    await act(async () => {
      rejectDraft(lateError);
    });

    expect(messageReadCount).toBe(0);
    expect(mockHeroBuilderSectionProps).toHaveBeenCalledTimes(
      renderCountBeforeUnmount,
    );
  });

  it("invalidates a combined catalog request when the screen unmounts", async () => {
    let rejectCatalog!: (error: Error) => void;
    let messageReadCount = 0;
    const lateError = new Error();
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

    await act(async () => {
      rejectCatalog(lateError);
    });

    expect(messageReadCount).toBe(0);
    expect(mockHeroBuilderSectionProps).toHaveBeenCalledTimes(
      renderCountBeforeUnmount,
    );
  });

  it("does not request a draft for an invalid current tab", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();
  });

  it("saves the newly prepared tab as a partial draft before marking it saved", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });

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

    await waitFor(() => {
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          heroId: "bastet",
          buildSet: expect.objectContaining({ schemaVersion: 2 }),
        }),
      );
    });
  });

  it("keeps the selected hero header during the not-created to unfinished refresh", async () => {
    const refresh = createDeferred<HeroBuildSetStatusIds>();

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockReturnValueOnce(refresh.promise);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    expect(screen.getByLabelText("Герой Бастет выбран")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );

    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(screen.getByLabelText("Бастет selected hero")).toBeTruthy();
    expect(screen.getByLabelText("Загрузка списка героев")).toBeTruthy();
    expect(screen.queryByText("Загрузка героев")).toBeNull();

    await act(async () => {
      refresh.resolve({ draftHeroIds: ["bastet"], publishedHeroIds: [] });
    });

    expect(await screen.findAllByText("Билд обновлён.")).not.toHaveLength(0);
  });

  it("blocks duplicate save and publication while a tab save is pending", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
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
    fireEvent.press(screen.getByText("Обновить"));

    expect(screen.getByText("Обновляем...")).toBeTruthy();
    fireEvent.press(screen.getByText("Обновляем..."));
    expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });
  });

  it("keeps the editable form when server tab saving fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockRejectedValue(new Error("save failed"));

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    expect(screen.getByLabelText("Remove Air Rune")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

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
    mockUpdatePublishedHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
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
    fireEvent.press(screen.getByText("Обновить"));
    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();

    await act(async () => {
      resolveSave();
    });

    expect(
      await screen.findAllByText(
        "Билд обновлён на сервере, но форма уже изменилась.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByText("Обновить"));
    expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1);
    expect(
      within(screen.getByTestId("branch-builder-equipment-section")).getByText(
        "PvP: Выберите руну.",
      ),
    ).toBeTruthy();
  });

  it("reports a stale form when it changes during catalog refresh", async () => {
    let resolveSave!: () => void;
    let resolveRefresh!: (ids: HeroBuildSetStatusIds) => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockImplementation(
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

    act(() => {
      resolveSave();
    });
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByText("Обновляем...")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();

    await act(async () => {
      resolveRefresh({ draftHeroIds: ["bastet"], publishedHeroIds: [] });
    });

    expect(
      await screen.findAllByText(
        "Билд обновлён на сервере, но форма уже изменилась.",
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

    fireEvent.press(screen.getByLabelText("Remove Air Rune"));

    await act(async () => {
      rejectRefresh(new Error("refresh failed"));
    });

    expect(
      await screen.findAllByText(
        "Билд обновлён на сервере, но форма уже изменилась.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Вкладка сохранена.")).toBeNull();
    expect(screen.queryByLabelText("Remove Air Rune")).toBeNull();
    expect(
      screen.getByText("Не удалось загрузить списки героев"),
    ).toBeTruthy();
  });

  it("invalidates a pending tab save on logout", async () => {
    let resolveSave!: () => void;

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
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
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
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
    Object.defineProperty(lateError, "message", {
      configurable: true,
      get: () => {
        messageReadCount += 1;
        return "late save failure";
      },
    });
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockUpdatePublishedHeroBuildSet.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject;
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
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));
    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    view.unmount();

    await act(async () => {
      rejectSave(lateError);
    });

    expect(messageReadCount).toBe(0);
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1);
  });

  it("keeps the local commit and catalog retry after refresh failure", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds
      .mockResolvedValueOnce({ draftHeroIds: [], publishedHeroIds: [] })
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockResolvedValue({ draftHeroIds: ["bastet"], publishedHeroIds: [] });

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
      await screen.findByText(
        "Не удалось загрузить списки героев",
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Повторить"));
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(3),
    );

    fireEvent.press(screen.getByLabelText(/^Weapon awakening slot 1,/));
    fireEvent.press(screen.getByText("Обновить"));
    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(2),
    );
  });

});
