const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));
const mockRouter = {
  canGoBack: jest.fn(() => false),
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockActions = {
  setOwnedCommonScrolls: jest.fn(),
  setOwnedLimitedScrolls: jest.fn(),
  setOwnedFactionScrolls: jest.fn(),
  setOwnedFateCrystals: jest.fn(),
  incrementPurchase: jest.fn(),
  decrementPurchase: jest.fn(),
  setIncludeCashback: jest.fn(),
  reset: jest.fn(),
};
let mockCalculatorState = {
  input: {
    ownedCommonScrolls: 0,
    ownedLimitedScrolls: 0,
    ownedFactionScrolls: 0,
    ownedFateCrystals: 0,
    purchasedCommonScrolls: 0,
    purchasedLimitedScrolls: 0,
    purchasedFateCrystals: 0,
    includeCashback: true,
  },
  isLoaded: true,
  storageError: null as string | null,
  ...mockActions,
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
    push: (href: string) => mockRouter.push(href),
    replace: (href: string) => mockRouter.replace(href),
  },
}));

jest.mock("../hooks/useSummonRivalryCalculator", () => ({
  __esModule: true,
  useSummonRivalryCalculator: () => mockCalculatorState,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import SummonRivalryScreen from "../screens/SummonRivalryScreen";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 });
  mockCalculatorState = {
    ...mockCalculatorState,
    input: {
      ownedCommonScrolls: 0,
      ownedLimitedScrolls: 0,
      ownedFactionScrolls: 0,
      ownedFateCrystals: 0,
      purchasedCommonScrolls: 0,
      purchasedLimitedScrolls: 0,
      purchasedFateCrystals: 0,
      includeCashback: true,
    },
    isLoaded: true,
    storageError: null,
  };
});

test("renders the complete loaded calculator", () => {
  render(<SummonRivalryScreen />);

  expect(screen.getByText("Призыв").props.numberOfLines).toBe(2);
  expect(screen.getByTestId("screen-header")).toBeTruthy();
  expect(
    screen.getByText("Калькулятор соперничества за призыв героев"),
  ).toBeTruthy();
  expect(screen.queryByLabelText("Итоговые очки: 0")).toBeNull();
  expect(screen.queryByText("До 12 000")).toBeNull();
  expect(screen.queryByText("Крупные сундуки")).toBeNull();
  expect(screen.getByText("Мои ресурсы")).toBeTruthy();
  expect(screen.getByText("Покупки за алмазы")).toBeTruthy();
  expect(screen.getByLabelText("Алмазы: 0")).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Учитывать кешбэк" })).toBeTruthy();
  expect(screen.getByLabelText("Очки соревнования: 0 из 12000")).toBeTruthy();
  expect(screen.getByText("Шкала наград")).toBeTruthy();
  expect(screen.getByText("Кешбэк")).toBeTruthy();
  expect(screen.getByText("Сбросить расчёт")).toBeTruthy();
});

test("forwards owned resources, all purchase actions, cashback, and reset", () => {
  render(<SummonRivalryScreen />);

  fireEvent.changeText(screen.getByLabelText("Количество свитков обычного призыва"), "1");
  fireEvent.changeText(screen.getByLabelText("Количество свитков ограниченного призыва"), "2");
  fireEvent.changeText(screen.getByLabelText("Количество свитков призыва фракции"), "3");
  fireEvent.changeText(screen.getByLabelText("Количество кристаллов судьбы"), "4");

  for (const label of [
    "Увеличить свитки обычного призыва",
    "Увеличить свитки ограниченного призыва",
    "Увеличить кристаллы судьбы",
  ]) {
    fireEvent.press(screen.getByLabelText(label));
  }

  expect(mockActions.setOwnedCommonScrolls).toHaveBeenCalledWith("1");
  expect(mockActions.setOwnedLimitedScrolls).toHaveBeenCalledWith("2");
  expect(mockActions.setOwnedFactionScrolls).toHaveBeenCalledWith("3");
  expect(mockActions.setOwnedFateCrystals).toHaveBeenCalledWith("4");
  expect(mockActions.incrementPurchase.mock.calls).toEqual([
    ["purchasedCommonScrolls"],
    ["purchasedLimitedScrolls"],
    ["purchasedFateCrystals"],
  ]);

  fireEvent.press(screen.getByRole("checkbox", { name: "Учитывать кешбэк" }));
  fireEvent.press(screen.getByText("Сбросить расчёт"));
  expect(mockActions.setIncludeCashback).toHaveBeenCalledWith(false);
  expect(mockActions.reset).toHaveBeenCalledTimes(1);
});

test("shows uncapped score, warning, and enabled decrement actions", () => {
  mockCalculatorState = {
    ...mockCalculatorState,
    input: {
      ...mockCalculatorState.input,
      ownedFateCrystals: 500,
      purchasedCommonScrolls: 10,
      purchasedLimitedScrolls: 10,
      purchasedFateCrystals: 10,
    },
    storageError: "Не удалось сохранить изменения. Калькулятор продолжает работать.",
  };
  render(<SummonRivalryScreen />);

  expect(screen.getByText(/\/ 12000$/).props.children[0]).toBeGreaterThan(12_000);
  expect(screen.getByRole("alert")).toBeTruthy();

  for (const label of [
    "Уменьшить свитки обычного призыва",
    "Уменьшить свитки ограниченного призыва",
    "Уменьшить кристаллы судьбы",
  ]) {
    fireEvent.press(screen.getByLabelText(label));
  }
  expect(mockActions.decrementPurchase.mock.calls).toEqual([
    ["purchasedCommonScrolls"],
    ["purchasedLimitedScrolls"],
    ["purchasedFateCrystals"],
  ]);
});

test("uses home fallback and opens the summon instruction", () => {
  render(<SummonRivalryScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));
  expect(mockRouter.replace).toHaveBeenCalledWith("/");

  fireEvent.press(
    screen.getByRole("button", { name: "Открыть инструкцию по призыву" }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith("/summon-rivalry/manual");
});

test("keeps fixed header and content clear of safe areas", () => {
  mockUseSafeAreaInsets.mockReturnValue({ top: 12, right: 0, bottom: 34, left: 0 });
  render(<SummonRivalryScreen />);

  const scrollView = screen.UNSAFE_getByType("RCTScrollView" as never);
  expect(scrollView.props.contentContainerStyle).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ paddingTop: 88, paddingBottom: 58 }),
    ]),
  );
});
