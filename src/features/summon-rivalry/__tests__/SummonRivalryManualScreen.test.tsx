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

import SummonRivalryManualScreen from "../screens/SummonRivalryManualScreen";

afterEach(() => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
});

test("renders exact summon scores, purchases, rewards, and calculator rules", () => {
  render(<SummonRivalryManualScreen />);

  for (const title of [
    "Быстрый расчёт",
    "Покупки за алмазы",
    "Кешбэк и каскад наград",
    "Шкала наград и сундуки",
    "Сброс расчёта",
  ]) {
    expect(screen.getByText(title)).toBeTruthy();
  }

  expect(
    screen.getByText(
      "Свиток обычного призыва даёт 27 очков; свиток ограниченного призыва и свиток призыва фракции — по 30 очков; кристалл судьбы — 50 очков.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "10 свитков обычного призыва стоят 2700 алмазов, 10 ограниченных свитков — 3000 алмазов, 10 кристаллов судьбы — 5000 алмазов.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Обычный сундук даёт 5 свитков обычного призыва и 5 осколков SSR героя.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Большой сундук даёт 5 кристаллов судьбы и 5 осколков UR героя.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Покупки за алмазы участвуют в основном расчёте очков и в каскаде кешбэка.",
    ),
  ).toBeTruthy();
});

test("returns to summon calculator without navigation history", () => {
  mockRouter.canGoBack.mockReturnValue(false);
  render(<SummonRivalryManualScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledWith("/summon-rivalry");
});
