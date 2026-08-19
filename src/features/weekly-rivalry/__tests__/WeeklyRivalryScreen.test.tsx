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
  setOwnedSpendResource: jest.fn(),
  setOwnedWeeklyEventChests: jest.fn(),
  setIncludeRivalryCashback: jest.fn(),
  setIncludeWeeklyEventChestCashback: jest.fn(),
  setIncludeQuestCashback: jest.fn(),
  setIncludeSharedCashback: jest.fn(),
  reset: jest.fn(),
};
let mockCalculatorState: Record<string, unknown>;
let mockHookEventId: string | undefined;

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

jest.mock("../hooks/useWeeklyRivalryCalculator", () => ({
  __esModule: true,
  useWeeklyRivalryCalculator: (config: { id: string }) => {
    mockHookEventId = config.id;
    return mockCalculatorState;
  },
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  beastlyEchoesConfig,
  towerOfBabelConfig,
  type WeeklyRivalryEventConfig,
  zodiacMapConfig,
} from "@/features/game-data/weekly-rivalry";

import { calculateWeeklyRivalryEventProgress } from "../model/calculateWeeklyRivalryEventProgress";
import BeastlyEchoesScreen from "../screens/BeastlyEchoesScreen";
import { WeeklyRivalryEventScreen } from "../screens/WeeklyRivalryEventScreen";
import ZodiacMapScreen from "../screens/ZodiacMapScreen";

function createCalculatorState(config: WeeklyRivalryEventConfig = beastlyEchoesConfig) {
  const input = {
    ownedSpendResource: 0,
    ownedWeeklyEventChests: 0,
    includeRivalryCashback: false,
    includeWeeklyEventChestCashback: false,
    includeQuestCashback: false,
    includeSharedCashback: false,
  };
  const progress = calculateWeeklyRivalryEventProgress(input, config);
  return {
    input,
    ...progress,
    isLoaded: true,
    storageError: null,
    ...mockActions,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHookEventId = undefined;
  mockCalculatorState = createCalculatorState();
});

test("renders the complete calculator with two visibly separate zones", () => {
  render(<BeastlyEchoesScreen />);

  expect(screen.getByText("Звериные эхо")).toBeTruthy();
  expect(
    screen.getByText("Калькулятор событий звериные эхо"),
  ).toBeTruthy();
  expect(screen.getByText("Соперничество")).toBeTruthy();
  expect(screen.getByText("Задания события")).toBeTruthy();
  expect(
    screen.getByText(
      "Печати зверя и сундуки используются в соперничестве и заданиях",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Очки и награды шкалы. Связь с заданиями задаёт общий кешбэк.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "1 печать зверя или 1 сундук дают одно очко. Связь с соперничеством задаёт общий кешбэк.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: "Учитывать кешбэк соперничества" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: "Учитывать общий кешбэк" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("checkbox", {
      name: "Учитывать кешбэк «Персон. сундук еженед. события»",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: "Учитывать кешбэк заданий" }),
  ).toBeTruthy();
  expect(screen.getByText("1 сундук = 1 печать зверя")).toBeTruthy();
  expect(screen.getAllByText("Печать зверя из наград")).toHaveLength(2);
  expect(
    screen.getByText(
      "Включённые кешбэки соперничества и заданий учитываются в обеих зонах.",
    ),
  ).toBeTruthy();
  const checkboxLabels = [
    "Учитывать общий кешбэк",
    "Учитывать кешбэк соперничества",
    "Учитывать кешбэк «Персон. сундук еженед. события»",
    "Учитывать кешбэк заданий",
  ];
  expect(screen.getAllByRole("checkbox")).toHaveLength(checkboxLabels.length);
  for (const label of checkboxLabels) {
    expect(screen.getByRole("checkbox", { name: label })).not.toBeChecked();
  }
  expect(screen.getAllByText(/^Раздел [1-5]$/)).toHaveLength(5);
  expect(screen.getAllByTestId(/^weekly-task-/)).toHaveLength(30);
  expect(
    screen.getAllByLabelText(/^Сундук награды /),
  ).toHaveLength(16);
  expect(
    screen.getAllByLabelText(/^Кешбэк соперничества — /),
  ).toHaveLength(4);
  expect(screen.getAllByLabelText(/^Кешбэк заданий — /)).toHaveLength(12);
  expect(screen.queryByText("Учитывается в очках соперничества")).toBeNull();
  expect(screen.queryByText("Печати из собственных сундуков")).toBeNull();
  expect(screen.queryByText("Печати из полученных сундуков")).toBeNull();
  expect(screen.queryByText("Учитывается в заданиях события")).toBeNull();
  expect(
    screen.queryByText("Возвращено Печатей зверя заданиями"),
  ).toBeNull();
  expect(screen.queryByText("Итоговый прогресс заданий")).toBeNull();
  expect(screen.queryByText("Пока нет полученных наград")).toBeNull();
});

test("renders another event through the common screen without Beastly text", () => {
  mockCalculatorState = createCalculatorState(towerOfBabelConfig);
  render(
    <WeeklyRivalryEventScreen
      config={towerOfBabelConfig}
      manualRoute="/weekly-rivalry/tower-of-babel/manual"
    />,
  );

  expect(mockHookEventId).toBe("tower-of-babel");
  expect(screen.getByText("Вавилонская башня")).toBeTruthy();
  expect(
    screen.getByText("Калькулятор событий вавилонская башня"),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Молоты вознесения и сундуки используются в соперничестве и заданиях",
    ),
  ).toBeTruthy();
  expect(screen.getAllByText("Молот вознесения из наград")).toHaveLength(2);
  expect(screen.getByText("1 сундук = 1 молот вознесения")).toBeTruthy();

  fireEvent.press(
    screen.getByRole("button", {
      name: "Открыть инструкцию по событию Вавилонская башня",
    }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(
    "/weekly-rivalry/tower-of-babel/manual",
  );
});

test("the Zodiac wrapper selects only the Zodiac configuration", () => {
  mockCalculatorState = createCalculatorState(zodiacMapConfig);
  render(<ZodiacMapScreen />);

  expect(mockHookEventId).toBe("zodiac-map");
  expect(screen.getByText("Карта зодиака")).toBeTruthy();
  expect(
    screen.getByText("Калькулятор событий карта зодиака"),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Светящиеся жемчужины и сундуки используются в соперничестве и заданиях",
    ),
  ).toBeTruthy();
});

test("forwards two inputs, four toggles, and reset independently", () => {
  render(<BeastlyEchoesScreen />);

  fireEvent.changeText(screen.getByLabelText("Количество Печатей зверя"), "80");
  fireEvent.changeText(
    screen.getByLabelText(
      "Количество персональных сундуков еженедельного события",
    ),
    "4",
  );
  fireEvent.press(
    screen.getByRole("checkbox", { name: "Учитывать общий кешбэк" }),
  );
  fireEvent.press(
    screen.getByRole("checkbox", { name: "Учитывать кешбэк соперничества" }),
  );
  fireEvent.press(
    screen.getByRole("checkbox", {
      name: "Учитывать кешбэк «Персон. сундук еженед. события»",
    }),
  );
  fireEvent.press(
    screen.getByRole("checkbox", { name: "Учитывать кешбэк заданий" }),
  );
  fireEvent.press(screen.getByText("Сбросить расчёт"));

  expect(mockActions.setOwnedSpendResource).toHaveBeenCalledWith("80");
  expect(mockActions.setOwnedWeeklyEventChests).toHaveBeenCalledWith("4");
  expect(mockActions.setIncludeSharedCashback).toHaveBeenCalledWith(true);
  expect(mockActions.setIncludeRivalryCashback).toHaveBeenCalledWith(true);
  expect(
    mockActions.setIncludeWeeklyEventChestCashback,
  ).toHaveBeenCalledWith(true);
  expect(mockActions.setIncludeQuestCashback).toHaveBeenCalledWith(true);
  expect(mockActions.reset).toHaveBeenCalledTimes(1);
});

test("uses the home fallback and opens the event instruction", () => {
  render(<BeastlyEchoesScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));
  expect(mockRouter.replace).toHaveBeenCalledWith("/");

  fireEvent.press(
    screen.getByRole("button", {
      name: "Открыть инструкцию по событию Звериные эхо",
    }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(
    "/weekly-rivalry/beastly-echoes/manual",
  );
});
