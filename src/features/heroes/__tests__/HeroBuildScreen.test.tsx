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

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { getHeroBuildSet } from "@/features/game-data/heroes/heroBuilds";
import { HeroBuildScreen } from "@/features/heroes/screens/HeroBuildScreen";

describe("HeroBuildScreen", () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockRouter.back.mockClear();
    mockRouter.canGoBack.mockClear();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    mockGetSupabaseClient.mockReturnValue(null);
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
  });

  test("asks for confirmation, shows delete loading state, and returns to heroes after success", async () => {
    let resolveDelete!: (value: { data: null; error: null }) => void;
    const deletePromise = new Promise<{ data: null; error: null }>((resolve) => {
      resolveDelete = resolve;
    });
    const deleteEq = jest.fn(() => deletePromise);
    const deleteMock = jest.fn(() => ({ eq: deleteEq }));
    const fromMock = jest.fn(() => ({ delete: deleteMock }));

    mockGetSupabaseClient.mockReturnValue({ from: fromMock });

    render(
      <HeroBuildScreen
        heroId="bastet"
        initialAdminSession={ADMIN_SESSION}
      />,
    );

    fireEvent.press(screen.getByText("Удалить"));

    expect(screen.getByText("Удалить билд?")).toBeTruthy();
    expect(deleteEq).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Нет"));

    expect(screen.queryByText("Удалить билд?")).toBeNull();

    fireEvent.press(screen.getByText("Удалить"));
    fireEvent.press(screen.getByText("Да"));

    expect(screen.getByText("Удаляем...")).toBeTruthy();
    fireEvent.press(screen.getByText("Удаляем..."));
    expect(deleteEq).toHaveBeenCalledTimes(1);

    resolveDelete({ data: null, error: null });

    await waitFor(() => {
      expect(deleteEq).toHaveBeenCalledWith("hero_id", "bastet");
    });
    expect(await screen.findByText("Билд удалён.")).toBeTruthy();
    expect(mockRouter.replace).toHaveBeenCalledWith("/heroes");
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
});
