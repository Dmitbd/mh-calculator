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
  push: jest.fn(),
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
  router: {
    canGoBack: () => mockRouter.canGoBack(),
    back: () => mockRouter.back(),
    replace: (href: string) => mockRouter.replace(href),
    push: (href: string) => mockRouter.push(href),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import DivinityScreen from "../screens/DivinityScreen";

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => mockStorage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key: string, value: string) => {
    mockStorage.set(key, value);
  });
});

test("shows recovery with the regular header when progress data is damaged", async () => {
  mockStorage.set("divinity-progress", "{broken-json");

  render(<DivinityScreen />);

  await waitFor(() => {
    expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  });
  expect(screen.getByTestId("screen-header")).toBeTruthy();
  expect(screen.getByText("Божественность")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Повторить" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Сбросить" })).toBeTruthy();
  expect(screen.queryByText("Рассчитать")).toBeNull();
  expect(screen.queryByText("Загрузка прогресса...")).toBeNull();
});

test("retries only the damaged local record", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  mockStorage.set(
    "divinity-resources",
    JSON.stringify({ gemCounts: { 7: 5 } }),
  );
  render(<DivinityScreen />);
  await waitFor(() => {
    expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  });

  jest.clearAllMocks();
  mockStorage.set(
    "divinity-progress",
    JSON.stringify({ currentLevel: 8, filledSegments: 1 }),
  );
  fireEvent.press(screen.getByRole("button", { name: "Повторить" }));

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith("divinity-progress");
  expect(JSON.parse(mockStorage.get("divinity-resources") ?? "{}")).toMatchObject({
    gemCounts: { 7: 5 },
  });
});

test("resets only the damaged local record", async () => {
  mockStorage.set("divinity-progress", "{broken-json");
  const savedResources = JSON.stringify({
    chestCounts: { "600001": 3 },
    gemCounts: { 7: 5 },
  });
  mockStorage.set("divinity-resources", savedResources);
  render(<DivinityScreen />);
  await waitFor(() => {
    expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  });

  jest.clearAllMocks();
  fireEvent.press(screen.getByRole("button", { name: "Сбросить" }));

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "divinity-progress",
    expect.any(String),
  );
  expect(mockStorage.get("divinity-resources")).toBe(savedResources);
});

test("resets both damaged records with one action", async () => {
  mockStorage.set("divinity-progress", "{broken-progress");
  mockStorage.set("divinity-resources", "{broken-resources");
  render(<DivinityScreen />);
  await waitFor(() => {
    expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  });

  jest.clearAllMocks();
  fireEvent.press(screen.getByRole("button", { name: "Сбросить" }));

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
  expect(jest.mocked(AsyncStorage.setItem).mock.calls.map(([key]) => key).sort()).toEqual([
    "divinity-progress",
    "divinity-resources",
  ]);
});

test("waits for both initial reads before offering one recovery action", async () => {
  mockStorage.set("divinity-progress", "{broken-progress");
  let resolveResourcesRead: (value: string) => void = () => undefined;
  const resourcesRead = new Promise<string>((resolve) => {
    resolveResourcesRead = resolve;
  });
  jest.mocked(AsyncStorage.getItem).mockImplementation((key: string) =>
    key === "divinity-resources"
      ? resourcesRead
      : Promise.resolve(mockStorage.get(key) ?? null),
  );

  render(<DivinityScreen />);
  await waitFor(() => {
    expect(screen.getByText("Загрузка прогресса...")).toBeTruthy();
  });
  expect(screen.queryByText("Ошибка загрузки локальных данных.")).toBeNull();

  resolveResourcesRead("{broken-resources");
  await waitFor(() => {
    expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  });

  jest.clearAllMocks();
  fireEvent.press(screen.getByRole("button", { name: "Сбросить" }));
  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(jest.mocked(AsyncStorage.setItem).mock.calls.map(([key]) => key).sort()).toEqual([
    "divinity-progress",
    "divinity-resources",
  ]);
});

test("blocks both screen recovery actions while retry is pending", async () => {
  mockStorage.set("divinity-progress", "{broken-progress");
  render(<DivinityScreen />);
  await waitFor(() => {
    expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  });

  let resolveRetry: (value: string) => void = () => undefined;
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(
    new Promise<string>((resolve) => {
      resolveRetry = resolve;
    }),
  );
  fireEvent.press(screen.getByRole("button", { name: "Повторить" }));

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Повторить" }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Сбросить" }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  resolveRetry(JSON.stringify({ currentLevel: 6 }));
  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
});

test("opens the divinity instruction screen", async () => {
  mockRouter.push.mockClear();
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  fireEvent.press(screen.getByLabelText("Открыть инструкцию"));

  expect(mockRouter.push).toHaveBeenCalledWith("/divinity/manual");
});

test("increments level and shows updated totals", async () => {
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(screen.getByText("Божественность").props.numberOfLines).toBe(2);
  expect(screen.getByTestId("screen-header")).toBeTruthy();
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
  mockUseSafeAreaInsets.mockReturnValue({
    top: 12,
    right: 0,
    bottom: 34,
    left: 0,
  });

  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  const scrollView = screen.UNSAFE_getByType("RCTScrollView" as never);
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
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getAllByText("2")[0]).toBeTruthy();
    expect(screen.getByLabelText("Понизить божественность").props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText("Повысить божественность").props.accessibilityState.disabled).toBe(true);
  });

  fireEvent.press(screen.getByLabelText("Повысить божественность"));

  await waitFor(() => {
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getAllByText("2")[0]).toBeTruthy();
  });
});

test("autofill leaves the selected end level empty", async () => {
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
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  for (let index = 0; index < 28; index += 1) {
    fireEvent.press(screen.getByLabelText("Уменьшить конечный уровень"));
  }

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByText("5")).toBeTruthy();
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

test("applies confirmed owned resources to the remaining cost", async () => {
  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Переключить автозаполнение"));

  await waitFor(() => {
    expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 82")).toBeTruthy();
    expect(screen.getByLabelText("Осталось самоцветов 6 ур.: 398")).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  fireEvent.changeText(
    screen.getByLabelText("Количество сундуков 600001"),
    "1",
  );

  expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 82")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Сохранить сундуки 600001"));

  await waitFor(() => {
    expect(screen.getByLabelText("Осталось самоцветов 1 ур.: 62")).toBeTruthy();
  });
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
