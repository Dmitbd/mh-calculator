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

import DivinityTalentManualScreen from "../screens/DivinityTalentManualScreen";

afterEach(() => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
});

test("explains every rule of the divinity talent calculator", () => {
  render(<DivinityTalentManualScreen />);

  expect(screen.getByText("Как пользоваться калькулятором")).toBeTruthy();
  expect(screen.getByText("Выбор диапазона")).toBeTruthy();
  expect(screen.getByText("Цена ноды")).toBeTruthy();
  expect(screen.getByText("Общий расход")).toBeTruthy();
  expect(screen.getByText("Сохранение и сброс")).toBeTruthy();
  expect(
    screen.getByText(
      "Первое нажатие задаёт начало пути, второе — конец. Обе выбранные ноды входят в расчёт.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Левая, центральная и правая ветки выбираются независимо и складываются в общий расчёт.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Если начало и конец стоят на одной ноде, учитывается ровно одна покупка.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Малые ноды показывают название и значение характеристики, крупные — «Большая нода». Точная ненулевая цена постоянно показана под каждой нодой; ресурсы с нулевой стоимостью в подписи скрыты.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Подсвечивается только выбранный путь. После последней выбранной ноды яркая линия заканчивается у её подписи и не продолжается до следующей невыбранной ноды.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Каждая существующая нода диапазона считается отдельной покупкой; пустые уровни ветки пропускаются.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Цена покупки — базовая стоимость уровня в очках веры плюс дополнительные ресурсы конкретной ноды. Одинаковый уровень в разных ветках оплачивается отдельно.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/Нажмите на ноду, чтобы увидеть/)).toBeNull();
  expect(
    screen.getByText(
      "Карточка расходов объединяет выбранные диапазоны всех трёх веток и показывает полный набор ресурсов, включая нулевые значения.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Выбранные диапазоны сохраняются локально. Кнопка «Сбросить расчёт» очищает все три ветки.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Собственные ресурсы пока не вычитаются: экран показывает полную стоимость выбранных нод.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "В расход входят только очки веры, унаследованная божественность и резонансный камень божественности. Самоцветы уровня божественности не учитываются.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/точк[аи] A|точк[аи] B/)).toBeNull();
  expect(screen.queryByText("Мои ресурсы")).toBeNull();
});

test("returns to the calculator when navigation history is unavailable", () => {
  mockRouter.canGoBack.mockReturnValue(false);

  render(<DivinityTalentManualScreen />);
  fireEvent.press(screen.getByLabelText("Назад"));

  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledWith("/divinity-talents");
});
