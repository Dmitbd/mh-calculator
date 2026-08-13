const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));
const mockRouter = {
  canGoBack: jest.fn(() => true),
  back: jest.fn(),
  replace: jest.fn(),
};

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  router: {
    canGoBack: () => mockRouter.canGoBack(),
    back: () => mockRouter.back(),
    replace: (href: string) => mockRouter.replace(href),
  },
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import AntiqueManualScreen from "../screens/AntiqueManualScreen";

afterEach(() => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
});

test("renders the antique calculator instructions with its domain rules", () => {
  render(<AntiqueManualScreen />);

  expect(screen.getByText("Быстрый расчёт")).toBeTruthy();
  expect(screen.getByText("Распределение монет")).toBeTruthy();
  expect(screen.getByText("Кешбэк и каскад наград")).toBeTruthy();
  expect(screen.getByText("Шкала наград и сундуки")).toBeTruthy();
  expect(screen.getByText("Сброс расчёта")).toBeTruthy();
  expect(
    screen.getByText("500 монет дают 1 карту гробницы, а 1000 монет — 1 карту храма."),
  ).toBeTruthy();
  expect(
    screen.getByText("Карта гробницы даёт 30 очков, карта храма — 60 очков."),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Остаток меньше 500 монет сохраняется как неиспользованные монеты и не исчезает.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Кешбэк рассчитывается последовательно: сначала открывается достигнутый узел, затем возвращённые карты могут открыть следующий.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("Максимум шкалы — 12 000 очков.")).toBeTruthy();
  expect(
    screen.getByText(
      "Кнопка «Сбросить расчёт» возвращает монеты и карты к нулевым значениям и оставляет кешбэк включённым.",
    ),
  ).toBeTruthy();
});

test("returns to antiques when navigation history is unavailable", () => {
  mockRouter.canGoBack.mockReturnValue(false);

  render(<AntiqueManualScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));

  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledWith("/antiques");
});
