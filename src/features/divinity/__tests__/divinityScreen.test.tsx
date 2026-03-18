const mockStorage = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import DivinityScreen from "../../../../app/divinity";

test("increments level and shows updated totals", async () => {
  mockStorage.clear();

  render(<DivinityScreen />);

  await waitFor(() => expect(screen.getByText("Рассчитать")).toBeTruthy());
  expect(screen.getByText("От")).toBeTruthy();
  expect(screen.getByText("До")).toBeTruthy();
  expect(screen.getByText("19")).toBeTruthy();
  expect(screen.getByText("Расход ресурсов")).toBeTruthy();
  expect(screen.getByLabelText("Повысить божественность")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Повысить божественность"));

  await waitFor(() => {
    expect(screen.getByText("1 ур.")).toBeTruthy();
    expect(screen.getByText("2 ур.")).toBeTruthy();
    expect(screen.getAllByText("1")[0]).toBeTruthy();
    expect(screen.getByText("Расход ресурсов")).toBeTruthy();
    expect(screen.queryByText("Mythic Heroes")).toBeNull();
    expect(screen.queryByText("Прогресс кольца")).toBeNull();
    expect(screen.queryByText("Текущий уровень: 0")).toBeNull();
    expect(screen.queryByText("Заполнено делений в текущем уровне: 1")).toBeNull();
    expect(screen.queryByText("Следующий шаг: Lv.1")).toBeNull();
    expect(screen.queryByText("Деления: 1 / 3")).toBeNull();
    expect(screen.queryByText("Максимальный ранг")).toBeNull();
    expect(screen.queryByText("Завершено уровней: 0")).toBeNull();
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
