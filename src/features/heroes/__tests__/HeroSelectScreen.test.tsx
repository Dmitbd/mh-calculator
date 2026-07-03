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

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { heroes, heroesWithBuilds } from "@/features/game-data/heroes/heroBuilds";
import { HeroSelectScreen } from "@/features/heroes/screens/HeroSelectScreen";

describe("HeroSelectScreen", () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    mockGetSupabaseClient.mockReset();
    mockGetSupabaseClient.mockReturnValue(null);
    mockFetchPublishedHeroIds.mockReset();
    mockFetchPublishedHeroIds.mockResolvedValue([]);
  });

  test("shows Bastet when she has a build", () => {
    render(<HeroSelectScreen />);

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

  test("keeps the screen controls visible and replaces the hero list with a loader while builds load", async () => {
    let resolveHeroIds!: (heroIds: string[]) => void;
    const loadingHeroIds = new Promise<string[]>((resolve) => {
      resolveHeroIds = resolve;
    });
    mockGetSupabaseClient.mockReturnValue({});
    mockFetchPublishedHeroIds.mockReturnValue(loadingHeroIds);

    render(<HeroSelectScreen />);

    expect(screen.getByLabelText("Поиск героя")).toBeTruthy();
    expect(screen.getByText("Роль")).toBeTruthy();
    expect(screen.getByText("Загружаем билды...")).toBeTruthy();
    expect(screen.queryByText("Бастет")).toBeNull();

    resolveHeroIds([]);

    await waitFor(() => {
      expect(screen.queryByText("Загружаем билды...")).toBeNull();
    });
    expect(screen.getByText("Бастет")).toBeTruthy();
  });
});
