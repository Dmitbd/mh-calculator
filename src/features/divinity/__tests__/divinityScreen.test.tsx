const mockStorage = new Map<string, string>();
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

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  router: mockRouter,
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import DivinityScreen from "../../../../app/divinity";

test("increments level and shows updated totals", async () => {
  mockStorage.clear();

  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(screen.getByText("Божественность").props.numberOfLines).toBe(1);
  expect(screen.queryByText(/^divinity$/i)).toBeNull();
  expect(screen.getByLabelText("Назад")).toBeTruthy();
  expect(screen.queryByText("Mythic Heroes")).toBeNull();
  expect(screen.getByText("От")).toBeTruthy();
  expect(screen.getByText("До")).toBeTruthy();
  expect(screen.getByText("Автозаполнение")).toBeTruthy();
  expect(screen.getByText("30")).toBeTruthy();
  expect(screen.getByText("Расход ресурсов")).toBeTruthy();
  expect(screen.getByText("6 ур.")).toBeTruthy();
  expect(screen.getByText("7 ур.")).toBeTruthy();
  expect(screen.getByLabelText("Понизить божественность")).toBeTruthy();
  expect(screen.getByLabelText("Повысить божественность")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Повысить божественность"));

  await waitFor(() => {
    expect(screen.getByText("Божественность")).toBeTruthy();
    expect(screen.getByLabelText("Назад")).toBeTruthy();
    expect(screen.queryByText("Mythic Heroes")).toBeNull();
    expect(screen.getByText("1 ур.")).toBeTruthy();
    expect(screen.getByText("2 ур.")).toBeTruthy();
    expect(screen.getAllByText("1")[0]).toBeTruthy();
    expect(screen.getByText("Расход ресурсов")).toBeTruthy();
    expect(screen.queryByText("Прогресс кольца")).toBeNull();
    expect(screen.queryByText("Текущий уровень: 0")).toBeNull();
    expect(screen.queryByText("Заполнено делений в текущем уровне: 1")).toBeNull();
    expect(screen.queryByText("Следующий шаг: Lv.1")).toBeNull();
    expect(screen.queryByText("Деления: 1 / 3")).toBeNull();
    expect(screen.queryByText("Максимальный ранг")).toBeNull();
    expect(screen.queryByText("Завершено уровней: 0")).toBeNull();
  });
});

test("decrements progress with the minus button", async () => {
  mockStorage.clear();

  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Повысить божественность"));
  fireEvent.press(screen.getByLabelText("Повысить божественность"));

  await waitFor(() => {
    expect(screen.getByText("2")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Понизить божественность"));

  await waitFor(() => {
    expect(screen.getAllByText("1")[0]).toBeTruthy();
  });
});

test("preserves progress when the selected range expands", async () => {
  mockStorage.clear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));
  fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));
  fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));
  fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));

  await waitFor(() => expect(screen.getByText("5")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Повысить божественность"));
  fireEvent.press(screen.getByLabelText("Повысить божественность"));

  await waitFor(() => {
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Уменьшить начальный уровень"));

  await waitFor(() => {
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("28")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });
});

test("decreasing end level also decreases start level when the range would collapse", async () => {
  mockStorage.clear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  for (let index = 0; index < 15; index += 1) {
    fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));
  }

  await waitFor(() => {
    expect(screen.getByText("16")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  for (let index = 0; index < 13; index += 1) {
    fireEvent.press(screen.getByLabelText("Уменьшить конечный уровень"));
  }

  await waitFor(() => {
    expect(screen.getByText("16")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Уменьшить конечный уровень"));

  await waitFor(() => {
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText("16")).toBeTruthy();
    expect(screen.queryByText("17")).toBeNull();
  });
});

test("adds bottom safe area space below the reset button", async () => {
  mockStorage.clear();
  mockUseSafeAreaInsets.mockReturnValue({
    top: 12,
    right: 0,
    bottom: 34,
    left: 0,
  });

  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  const scrollView = screen.UNSAFE_getByType("RCTScrollView");
  expect(scrollView.props.stickyHeaderIndices).toBeUndefined();
  expect(scrollView.props.contentContainerStyle).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        paddingTop: 88,
        paddingBottom: 58,
      }),
    ]),
  );

  mockUseSafeAreaInsets.mockReturnValue({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
});

test("autofill completes the selected range and disables manual circle progress", async () => {
  mockStorage.clear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  for (let index = 0; index < 28; index += 1) {
    fireEvent.press(screen.getByLabelText("Уменьшить конечный уровень"));
  }

  await waitFor(() => {
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getAllByText("2")[0]).toBeTruthy();
    expect(screen.getByLabelText("Понизить божественность").props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText("Повысить божественность").props.accessibilityState.disabled).toBe(true);
  });

  fireEvent.press(screen.getByLabelText("Повысить божественность"));

  await waitFor(() => {
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getAllByText("2")[0]).toBeTruthy();
  });
});

test("autofill leaves the selected end level empty", async () => {
  mockStorage.clear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  for (let index = 0; index < 7; index += 1) {
    fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));
  }

  for (let index = 0; index < 18; index += 1) {
    fireEvent.press(screen.getByLabelText("Уменьшить конечный уровень"));
  }

  await waitFor(() => {
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getByText("78")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByLabelText("Понизить божественность").props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText("Повысить божественность").props.accessibilityState.disabled).toBe(true);
  });
});

test("changing range during autofill resets manual progress when autofill is turned off", async () => {
  mockStorage.clear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  for (let index = 0; index < 28; index += 1) {
    fireEvent.press(screen.getByLabelText("Уменьшить конечный уровень"));
  }

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getAllByText("2")[0]).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Увеличить начальный уровень"));

  await waitFor(() => {
    expect(screen.getAllByText("2")[0]).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByText("1 ур.")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByLabelText("Понизить божественность").props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText("Повысить божественность").props.accessibilityState.disabled).toBe(false);
  });
});
