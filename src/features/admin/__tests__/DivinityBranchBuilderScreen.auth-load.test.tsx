jest.mock("@/shared/ui/useImageLoadingTransition", () => ({
  useImageLoadingTransition: () => ({
    handleError: jest.fn(),
    handleLoad: jest.fn(),
    phase: "pending",
    prefersReducedMotion: true,
  }),
}));

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
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

describe("DivinityBranchBuilderScreen: auth-load", () => {
  installBuilderScreenTestLifecycle();
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

  it("shows the shared loader while the initial admin session is checked", async () => {
    const session = createDeferred<null>();
    mockGetSupabaseClient.mockReturnValue({ auth: {} });
    mockGetCurrentAdminSession.mockReturnValue(session.promise);

    render(<DivinityBranchBuilderScreen />);

    expect(
      screen.getByRole("progressbar", { name: "Проверяем доступ" }),
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText("Email")).toBeNull();

    session.resolve(null);

    expect(await screen.findByPlaceholderText("Email")).toBeTruthy();
    expect(screen.queryByText("Проверяем доступ")).toBeNull();
  });

  it("keeps edit controls blocked from session restore until the build load starts", async () => {
    const session = createDeferred<typeof ADMIN_SESSION>();
    mockGetSupabaseClient.mockReturnValue({ auth: {}, from: jest.fn() });
    mockGetCurrentAdminSession.mockReturnValue(session.promise);
    mockLoadPublishedHeroBuildSet.mockReturnValue(
      new Promise(() => undefined),
    );

    render(
      <DivinityBranchBuilderScreen
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await act(async () => {
      session.resolve(ADMIN_SESSION);
    });

    expect(
      screen.getByRole("progressbar", { name: "Загружаем билд..." }),
    ).toBeTruthy();
    expect(mockEquipmentBuilderSectionRender).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Выбрать героя")).toBeNull();
    expect(screen.queryByTestId("branch-builder-target-tabs-section")).toBeNull();
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
        "Не удалось загрузить списки героев",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Выбрать героя Бастет")).toBeNull();

    fireEvent.press(screen.getByText("Повторить"));

    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByLabelText("Выбрать героя")).toBeTruthy();
  });

  it("shows one dirty-only edit action on the published update path", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText(/загружен для редактирования\./);
    await waitFor(() =>
      expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(1),
    );
    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
    expect(screen.queryByText("Скачать полный JSON")).toBeNull();
    expect(screen.queryByText("Загрузить билд")).toBeNull();
    expect(screen.queryByText("Сохранить черновик")).toBeNull();

    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledTimes(1),
    );
    expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledWith(
      expect.anything(),
      {
        buildSet: expect.anything(),
        expectedRevision: 1,
        heroId: "bastet",
      },
    );
    expect(mockCreateOrUpdateDraftHeroBuildSet).not.toHaveBeenCalled();
    expect(mockPublishDraftHeroBuildSet).not.toHaveBeenCalled();
    expect(await screen.findAllByText("Билд обновлён.")).not.toHaveLength(0);
    expect(screen.queryByText("Обновить")).toBeNull();
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(mockFetchHeroBuildSetStatusIds).toHaveBeenCalledTimes(2);
  });

  it("asks before a dirty header back action on web and leaves clean back unguarded", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    const confirmSpy = jest.mocked(window.confirm);
    confirmSpy.mockReturnValue(false);

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText(/загружен для редактирования\./);
    fireEvent.press(screen.getByLabelText("Назад"));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();

    mockRouter.back.mockClear();
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByLabelText("Назад"));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
    expect(mockRouter.back).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.press(screen.getByLabelText("Назад"));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));

    view.unmount();
  });

  it("uses a native confirmation before leaving a dirty edit", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(
      (_title, _message, buttons) => {
        buttons?.find((button) => button.text === "Выйти")?.onPress?.();
      },
    );

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText(/загружен для редактирования\./);
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByLabelText("Назад"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Несохранённые изменения",
        "Выйти без сохранения?",
        expect.arrayContaining([
          expect.objectContaining({ text: "Остаться" }),
          expect.objectContaining({ text: "Выйти" }),
        ]),
        { cancelable: false },
      ),
    );
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it("registers and symmetrically removes web beforeunload only while dirty", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    const addEventListenerSpy = jest.mocked(window.addEventListener);
    const removeEventListenerSpy = jest.mocked(window.removeEventListener);

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText(/загружен для редактирования\./);
    expect(
      addEventListenerSpy.mock.calls.some(([type]) => type === "beforeunload"),
    ).toBe(false);

    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));

    await waitFor(() =>
      expect(
        addEventListenerSpy.mock.calls.some(([type]) => type === "beforeunload"),
      ).toBe(true),
    );
    const beforeUnloadListener = addEventListenerSpy.mock.calls.find(
      ([type]) => type === "beforeunload",
    )?.[1];
    const event = {
      preventDefault: jest.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    expect(beforeUnloadListener).toBeDefined();
    (beforeUnloadListener as EventListener)(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe("");

    view.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      beforeUnloadListener,
    );
  });

  it("asks before logging out with dirty edits", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    const confirmSpy = jest.mocked(window.confirm);
    confirmSpy.mockReturnValue(false);
    mockGetSupabaseClient.mockReturnValue({ auth: {}, from: jest.fn() });
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
    fireEvent.press(screen.getByText("Выйти"));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
    expect(mockSignOutAdmin).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.press(screen.getByText("Выйти"));
    await waitFor(() => expect(mockSignOutAdmin).toHaveBeenCalledTimes(1));
  });

  it("reloads a clean published edit session with a fresh revision after logout and sign in", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    const firstRecord = {
      ...getBuildSetRecord("published", 3),
      buildSet: getValidBastetBuildSet(),
    };
    const reloadedRecord = {
      ...getBuildSetRecord("published", 8),
      buildSet: getValidBastetBuildSet(),
    };

    mockGetSupabaseClient.mockReturnValue({ auth: {}, from: jest.fn() });
    mockFetchPublishedHeroBuildSetRecord
      .mockResolvedValueOnce(firstRecord)
      .mockResolvedValueOnce(reloadedRecord);
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });
    mockSignOutAdmin.mockResolvedValue(undefined);
    mockSignInAdmin.mockResolvedValue(ADMIN_SESSION);

    render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await waitFor(() =>
      expect(mockFetchPublishedHeroBuildSetRecord).toHaveBeenCalledTimes(1),
    );
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    expect(screen.getByText("Обновить")).toBeTruthy();

    fireEvent.press(screen.getByText("Выйти"));
    await screen.findByPlaceholderText("Email");
    fireEvent.changeText(screen.getByPlaceholderText("Email"), "admin@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Пароль"), "secret");
    fireEvent.press(screen.getByText("Войти"));

    await waitFor(() =>
      expect(mockFetchPublishedHeroBuildSetRecord).toHaveBeenCalledTimes(2),
    );
    await screen.findByLabelText("Изменить героя: Бастет");
    expect(screen.queryByText("Обновить")).toBeNull();

    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expectedRevision: 8,
          heroId: "bastet",
        }),
      ),
    );
  });

  it("preserves the published revision and dirty update after logout fails", async () => {
    mockGetSupabaseClient.mockReturnValue({ auth: {}, from: jest.fn() });
    mockFetchPublishedHeroBuildSetRecord.mockResolvedValue(
      getBuildSetRecord("published", 7),
    );
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
      publishedHeroIds: ["bastet"],
    });
    mockSignOutAdmin.mockRejectedValue(new Error("session retained"));
    mockUpdatePublishedHeroBuildSet.mockResolvedValue(
      getBuildSetRecord("published", 8),
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
    fireEvent.press(screen.getByText("Выйти"));

    expect(
      await screen.findByText("Ошибка выхода: session retained"),
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(mockUpdatePublishedHeroBuildSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expectedRevision: 7,
          heroId: "bastet",
        }),
      ),
    );
    expect(await screen.findAllByText("Билд обновлён.")).not.toHaveLength(0);
    expect(screen.queryByText("Обновить")).toBeNull();
  });

  it("serializes duplicate dirty logout confirmations and actions", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    let confirmExit!: () => void;
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(
      (_title, _message, buttons) => {
        confirmExit = () =>
          buttons?.find((button) => button.text === "Выйти")?.onPress?.();
      },
    );

    mockGetSupabaseClient.mockReturnValue({ auth: {}, from: jest.fn() });
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
    fireEvent.press(screen.getByText("Выйти"));
    fireEvent.press(screen.getByText("Выйти"));

    expect(alertSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      confirmExit();
    });

    expect(mockSignOutAdmin).toHaveBeenCalledTimes(1);
  });

  it("does not continue a confirmed logout after the builder unmounts", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    let confirmExit!: () => void;
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      confirmExit = () =>
        buttons?.find((button) => button.text === "Выйти")?.onPress?.();
    });

    mockGetSupabaseClient.mockReturnValue({ auth: {}, from: jest.fn() });
    mockSignOutAdmin.mockResolvedValue(undefined);

    const view = render(
      <DivinityBranchBuilderScreen
        initialAdminSession={ADMIN_SESSION}
        initialHeroId="bastet"
        initialMode="edit"
      />,
    );

    await screen.findAllByText("Билд загружен для редактирования.");
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByText("Выйти"));
    view.unmount();

    await act(async () => {
      confirmExit();
    });

    expect(mockSignOutAdmin).not.toHaveBeenCalled();
  });

  it("asks before switching heroes with dirty edits", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    const confirmSpy = jest.mocked(window.confirm);
    confirmSpy.mockReturnValue(false);
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
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
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Изменить героя: Бастет")).toBeTruthy();
    expect(screen.queryByLabelText("Изменить героя: Морана")).toBeNull();

    confirmSpy.mockReturnValue(true);
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));
    expect(await screen.findByLabelText("Изменить героя: Морана")).toBeTruthy();
  });

  it("keeps the first hero intent while a dirty switch confirmation is pending", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    let confirmExit!: () => void;
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(
      (_title, _message, buttons) => {
        confirmExit = () =>
          buttons?.find((button) => button.text === "Выйти")?.onPress?.();
      },
    );

    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
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
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, Зелёный"));
    fireEvent.press(screen.getByLabelText("Изменить героя: Бастет"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Морана"));
    fireEvent.press(screen.getByLabelText("Выбрать героя Королева запада"));

    expect(alertSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      confirmExit();
    });

    expect(await screen.findByLabelText("Изменить героя: Морана")).toBeTruthy();
    expect(screen.queryByLabelText("Изменить героя: Королева запада")).toBeNull();
  });

  it("update opens the first invalid published leaf and maps its inline error", async () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, "scrollTo");
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
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
      fireEvent.press(screen.getByLabelText("Select PvE build tab"));
      fireEvent.press(screen.getByLabelText("Select Кампания build tab"));
      fireEvent.press(screen.getByLabelText("Remove Air Rune"));
      fireEvent.press(screen.getByLabelText("Select PvP build tab"));
      fireEvent(
        screen.getByTestId("branch-builder-equipment-section"),
        "layout",
        {
          nativeEvent: {
            layout: { height: 120, width: 320, x: 0, y: 600 },
          },
        },
      );
      scrollToSpy.mockClear();
      fireEvent.press(screen.getByText("Обновить"));

      expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(
          screen.getByLabelText("Select Кампания build tab").props
            .accessibilityState,
        ).toEqual(expect.objectContaining({ selected: true })),
      );
      expect(
        within(
          screen.getByTestId("branch-builder-equipment-section"),
        ).getByText("PvE -> Кампания: Выберите руну."),
      ).toBeTruthy();
      expect(scrollToSpy).toHaveBeenCalledWith({ animated: true, y: 510 });

      fireEvent.press(screen.getByLabelText("Добавить руну"));
      fireEvent.press(screen.getByLabelText("Add Air Rune"));

      expect(
        within(
          screen.getByTestId("branch-builder-equipment-section"),
        ).queryByText("PvE -> Кампания: Выберите руну."),
      ).toBeNull();
    scrollToSpy.mockRestore();
  });

  it("uses full edit validation order instead of preferring the current invalid leaf", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
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
    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    fireEvent.press(screen.getByLabelText("Select PvE build tab"));
    fireEvent.press(screen.getByLabelText("Select Кампания build tab"));
    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    fireEvent.press(screen.getByText("Обновить"));

    expect(mockUpdatePublishedHeroBuildSet).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Select PvP build tab").props.accessibilityState,
      ).toEqual(expect.objectContaining({ selected: true })),
    );
    expect(
      within(screen.getByTestId("branch-builder-equipment-section")).getByText(
        "PvP: Выберите руну.",
      ),
    ).toBeTruthy();
  });

  it("does not show a mapped edit error under another manually selected leaf", async () => {
    mockGetSupabaseClient.mockReturnValue({ from: jest.fn() });
    mockFetchHeroBuildSetStatusIds.mockResolvedValue({
      draftHeroIds: [],
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
    fireEvent.press(screen.getByLabelText("Select PvE build tab"));
    fireEvent.press(screen.getByLabelText("Select Кампания build tab"));
    fireEvent.press(screen.getByLabelText("Remove Air Rune"));
    fireEvent.press(screen.getByLabelText("Select PvP build tab"));
    fireEvent.press(screen.getByText("Обновить"));

    await waitFor(() =>
      expect(
        within(
          screen.getByTestId("branch-builder-equipment-section"),
        ).getByText("PvE -> Кампания: Выберите руну."),
      ).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText("Select PvP build tab"));

    expect(
      within(screen.getByTestId("branch-builder-equipment-section")).queryByText(
        "PvE -> Кампания: Выберите руну.",
      ),
    ).toBeNull();
  });

});
