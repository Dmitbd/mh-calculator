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

import DivinityManualScreen from "../screens/DivinityManualScreen";

afterEach(() => {
  mockRouter.canGoBack.mockReset();
  mockRouter.canGoBack.mockReturnValue(true);
  mockRouter.back.mockReset();
  mockRouter.replace.mockReset();
});

test("renders the manual sections and returns through navigation history", () => {
  render(<DivinityManualScreen />);

  expect(screen.getByText("Как пользоваться калькулятором")).toBeTruthy();
  expect(screen.getByText("Быстрый расчёт")).toBeTruthy();
  expect(
    screen.getByText("Расчёт с учётом текущего прогресса"),
  ).toBeTruthy();
  expect(screen.getByText("Мои ресурсы")).toBeTruthy();
  expect(screen.getByText("Сброс прогресса")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Назад"));

  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test("returns to divinity when navigation history is unavailable", () => {
  mockRouter.canGoBack.mockReturnValue(false);

  render(<DivinityManualScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));

  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledWith("/divinity");
});
