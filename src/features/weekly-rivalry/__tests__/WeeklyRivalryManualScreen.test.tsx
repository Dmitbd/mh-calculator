jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  __esModule: true,
  router: {
    canGoBack: () => false,
    back: jest.fn(),
    replace: (href: string) => mockReplace(href),
  },
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  towerOfBabelConfig,
  zodiacMapConfig,
} from "@/features/game-data/weekly-rivalry";

import BeastlyEchoesManualScreen from "../screens/BeastlyEchoesManualScreen";
import { WeeklyRivalryManualScreen } from "../screens/WeeklyRivalryManualScreen";
import ZodiacMapManualScreen from "../screens/ZodiacMapManualScreen";

beforeEach(() => {
  jest.clearAllMocks();
});

test("explains resources, isolated cashback, and the mutual cascade", () => {
  render(<BeastlyEchoesManualScreen />);

  expect(screen.getByText("Инструкция")).toBeTruthy();
  expect(screen.getByText("Звериные эхо")).toBeTruthy();
  expect(screen.getByText("Галочки кешбэка")).toBeTruthy();
  expect(screen.getByText("Общий кешбэк")).toBeTruthy();
  expect(
    screen.getByText(
      "Все четыре галочки выключены по умолчанию и после сброса расчёта.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Печати зверя и персональные сундуки еженедельного события являются общими исходными ресурсами для соперничества и заданий.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Когда общий кешбэк включён, активные источники взаимно продвигают обе зоны до остановки каскада.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText("Каждая награда учитывается в каскаде только один раз."),
  ).toBeTruthy();
});

test("returns from the Zodiac instruction to its own event", () => {
  render(<ZodiacMapManualScreen />);

  fireEvent.press(screen.getByLabelText("Назад"));
  expect(mockReplace).toHaveBeenCalledWith("/weekly-rivalry/zodiac-map");
});

test.each([
  {
    config: towerOfBabelConfig,
    title: "Вавилонская башня",
    resources: "Молоты вознесения",
    singular: "молот вознесения",
    singularTitle: "Молот вознесения",
  },
  {
    config: zodiacMapConfig,
    title: "Карта зодиака",
    resources: "Светящиеся жемчужины",
    singular: "светящаяся жемчужина",
    singularTitle: "Светящаяся жемчужина",
  },
])("substitutes only the configured resource on $title", ({
  config,
  title,
  resources,
  singular,
  singularTitle,
}) => {
  render(
    <WeeklyRivalryManualScreen
      config={config}
      fallbackHref="/weekly-rivalry/test"
    />,
  );

  expect(screen.getByText(title)).toBeTruthy();
  expect(
    screen.getByText(
      `${resources} и персональные сундуки еженедельного события являются общими исходными ресурсами для соперничества и заданий.`,
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      `1 ${singular} или 1 сундук дают 30 очков соперничества и одно очко задания.`,
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      `Кешбэк соперничества повторно учитывает основной ресурс из наград шкалы: «${singularTitle}».`,
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      `Кешбэк заданий повторно учитывает основной ресурс из наград выполненных заданий: «${singularTitle}».`,
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/Печат/)).toBeNull();
});
