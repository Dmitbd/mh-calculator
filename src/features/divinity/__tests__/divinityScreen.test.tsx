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

  await waitFor(() => expect(screen.getByText("Текущий уровень: 0")).toBeTruthy());

  fireEvent.press(screen.getByText("Повысить"));

  await waitFor(() => {
    expect(screen.getByText("Текущий уровень: 1")).toBeTruthy();
    expect(screen.getByText("5 ур.: 70")).toBeTruthy();
    expect(screen.getByText("6 ур.: 0")).toBeTruthy();
    expect(screen.getByText("7 ур.: 0")).toBeTruthy();
  });
});
