const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));
const mockRouter = {
  canGoBack: jest.fn(() => false),
  back: jest.fn(),
  replace: jest.fn(),
};
const mockSetCoins = jest.fn();
const mockSetOwnedTombMaps = jest.fn();
const mockSetOwnedTempleMaps = jest.fn();
const mockConvertOneToTemple = jest.fn();
const mockConvertOneToTombs = jest.fn();
const mockSetIncludeCashback = jest.fn();
const mockReset = jest.fn();
let mockCalculatorState = {
  input: {
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 0,
    ownedTempleMaps: 0,
    includeCashback: true,
  },
  isLoaded: true,
  storageError: null as string | null,
  setCoins: mockSetCoins,
  setOwnedTombMaps: mockSetOwnedTombMaps,
  setOwnedTempleMaps: mockSetOwnedTempleMaps,
  convertOneToTemple: mockConvertOneToTemple,
  convertOneToTombs: mockConvertOneToTombs,
  setIncludeCashback: mockSetIncludeCashback,
  reset: mockReset,
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

jest.mock("../hooks/useAntiqueCalculator", () => ({
  __esModule: true,
  useAntiqueCalculator: () => mockCalculatorState,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import AntiqueScreen from "../screens/AntiqueScreen";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSafeAreaInsets.mockReturnValue({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  mockCalculatorState = {
    ...mockCalculatorState,
    input: {
      coins: 0,
      templeMapAllocation: 0,
      ownedTombMaps: 0,
      ownedTempleMaps: 0,
      includeCashback: true,
    },
    isLoaded: true,
    storageError: null,
  };
});

test("renders the loaded calculator sections with the plain heading first", () => {
  render(<AntiqueScreen />);

  expect(screen.getByText("Антиквариат").props.numberOfLines).toBe(1);
  expect(
    screen.getByText("Калькулятор соперничества за антиквариат"),
  ).toBeTruthy();
  expect(screen.queryByText("Прогресс соперничества")).toBeNull();
  expect(screen.queryByText("Итоговые очки")).toBeNull();
  expect(screen.queryByText("Исходные очки")).toBeNull();
  expect(screen.queryByText("До 12 000")).toBeNull();
  expect(screen.queryByText("Узлы")).toBeNull();
  expect(screen.queryByText("Крупные сундуки")).toBeNull();
  expect(screen.getByText("Монеты исследования")).toBeTruthy();
  expect(screen.getByText("Мои карты")).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Учитывать кешбэк" })).toBeTruthy();
  expect(screen.getByText("Очки соревнования")).toBeTruthy();
  expect(screen.getByText("0 / 12000")).toBeTruthy();
  expect(
    screen.getByLabelText("Очки соревнования: 0 из 12000"),
  ).toBeTruthy();
  expect(screen.getByText("Шкала наград")).toBeTruthy();
  expect(screen.getByText("Кешбэк")).toBeTruthy();
  expect(screen.getByText("Сбросить расчёт")).toBeTruthy();
});

test("wires the uncapped total score into rivalry progress", () => {
  mockCalculatorState = {
    ...mockCalculatorState,
    input: {
      coins: 0,
      templeMapAllocation: 0,
      ownedTombMaps: 400,
      ownedTempleMaps: 0,
      includeCashback: true,
    },
  };

  render(<AntiqueScreen />);

  expect(screen.getByText("15000 / 12000")).toBeTruthy();
  expect(
    screen.getByLabelText("Очки соревнования: 15000 из 12000"),
  ).toBeTruthy();
});

test("shows a nonblocking persistence warning and keeps reset available", () => {
  mockCalculatorState = {
    ...mockCalculatorState,
    storageError:
      "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  };

  render(<AntiqueScreen />);

  expect(
    screen.getByText(
      "Не удалось сохранить изменения. Калькулятор продолжает работать.",
    ),
  ).toBeTruthy();
  fireEvent.press(screen.getByText("Сбросить расчёт"));
  expect(mockReset).toHaveBeenCalledTimes(1);
});

test("forwards input, conversion, and reset actions to the calculator hook", () => {
  mockCalculatorState = {
    ...mockCalculatorState,
    input: {
      coins: 2_000,
      templeMapAllocation: 1,
      ownedTombMaps: 2,
      ownedTempleMaps: 3,
      includeCashback: true,
    },
  };

  render(<AntiqueScreen />);

  fireEvent.changeText(
    screen.getByLabelText("Количество монет исследования"),
    "2500",
  );
  fireEvent.changeText(
    screen.getByLabelText("Количество своих карт гробницы"),
    "4",
  );
  fireEvent.changeText(
    screen.getByLabelText("Количество своих карт храма"),
    "5",
  );
  fireEvent.press(screen.getByLabelText("Увеличить карты храма"));
  fireEvent.press(screen.getByLabelText("Увеличить карты гробницы"));
  fireEvent.press(screen.getByText("Сбросить расчёт"));
  fireEvent.press(screen.getByRole("checkbox", { name: "Учитывать кешбэк" }));

  expect(mockSetCoins).toHaveBeenCalledWith("2500");
  expect(mockSetOwnedTombMaps).toHaveBeenCalledWith("4");
  expect(mockSetOwnedTempleMaps).toHaveBeenCalledWith("5");
  expect(mockConvertOneToTemple).toHaveBeenCalledTimes(1);
  expect(mockConvertOneToTombs).toHaveBeenCalledTimes(1);
  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockSetIncludeCashback).toHaveBeenCalledWith(false);
});

test("excludes cashback from score while keeping reached rewards visible", () => {
  mockCalculatorState = {
    ...mockCalculatorState,
    input: {
      coins: 0,
      templeMapAllocation: 0,
      ownedTombMaps: 45,
      ownedTempleMaps: 0,
      includeCashback: false,
    },
  };

  render(<AntiqueScreen />);

  expect(screen.getByText("1350 / 12000")).toBeTruthy();
  expect(screen.getByLabelText("Кешбэк — Карта гробницы: 5")).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: "Учитывать кешбэк" }).props
      .accessibilityState,
  ).toEqual({ checked: false });
});

test("falls back to the home route when there is no navigation history", () => {
  render(<AntiqueScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));

  expect(mockRouter.canGoBack).toHaveBeenCalledTimes(1);
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledWith("/");
});

test("keeps the fixed header and bottom content clear of safe areas", () => {
  mockUseSafeAreaInsets.mockReturnValue({
    top: 12,
    right: 0,
    bottom: 34,
    left: 0,
  });

  render(<AntiqueScreen />);

  const scrollView = screen.UNSAFE_getByType("RCTScrollView" as never);
  expect(scrollView.props.contentContainerStyle).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        paddingTop: 88,
        paddingBottom: 58,
      }),
    ]),
  );
});
