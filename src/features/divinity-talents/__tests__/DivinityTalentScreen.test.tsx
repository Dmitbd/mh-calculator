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

jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: jest.fn((assetPath: string) => `resolved:${assetPath}`),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";

import DivinityTalentScreen from "../screens/DivinityTalentScreen";

function textContent(children: unknown): string {
  if (Array.isArray(children)) {
    return children.map(textContent).join("");
  }
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return "";
}

async function waitForLoadedScreen() {
  await waitFor(() => {
    expect(
      screen.getByRole("button", {
        name: "Открыть инструкцию по талантам божественности",
      }),
    ).toBeTruthy();
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockUseSafeAreaInsets.mockReturnValue({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  await AsyncStorage.clear();
});

test("keeps back navigation while loading and renders calculator sections in product order", async () => {
  render(<DivinityTalentScreen />);

  expect(screen.getByText("Загрузка расчёта...")).toBeTruthy();
  expect(screen.getByTestId("screen-header")).toBeTruthy();
  expect(screen.getByText("Таланты божественности").props.numberOfLines).toBe(2);
  expect(screen.getByRole("button", { name: "Назад" })).toBeTruthy();
  expect(
    screen.queryByRole("button", {
      name: "Открыть инструкцию по талантам божественности",
    }),
  ).toBeNull();
  expect(screen.queryByText("Сбросить расчёт")).toBeNull();
  expect(
    screen.queryByTestId("divinity-talent-node-center-1"),
  ).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: "Назад" }));
  expect(mockRouter.replace).toHaveBeenCalledWith("/");

  await waitForLoadedScreen();

  const visibleText = screen
    .UNSAFE_getAllByType(Text)
    .map((node) => textContent(node.props.children));
  const instructionIndex = visibleText.indexOf("Инструкция");
  const hintIndex = visibleText.indexOf(
    "В каждой нужной ветке выберите начало и конец пути.",
  );
  const firstLevelIndex = visibleText.indexOf("1");
  const summaryIndex = visibleText.indexOf("Расход ресурсов");
  const resetIndex = visibleText.indexOf("Сбросить расчёт");

  expect(instructionIndex).toBeGreaterThanOrEqual(0);
  expect(hintIndex).toBeGreaterThan(instructionIndex);
  expect(firstLevelIndex).toBeGreaterThan(hintIndex);
  expect(visibleText).not.toContain("Левая");
  expect(visibleText).not.toContain("Центральная");
  expect(visibleText).not.toContain("Правая");
  expect(summaryIndex).toBeGreaterThan(firstLevelIndex);
  expect(resetIndex).toBeGreaterThan(summaryIndex);
});

test("selects one center node, opens the manual and resets the total", async () => {
  render(<DivinityTalentScreen />);
  await waitForLoadedScreen();

  fireEvent.press(screen.getByTestId("divinity-talent-node-center-1"));

  await waitFor(() => {
    expect(screen.getByLabelText("Выбрано нод: 1")).toBeTruthy();
    expect(screen.getByTestId("divinity-talent-node-caption-center-1")).toBeTruthy();
    expect(screen.queryByTestId("divinity-talent-node-details")).toBeNull();
    expect(screen.queryByText(/Самоцвет божественности/)).toBeNull();
  });

  fireEvent.press(
    screen.getByRole("button", {
      name: "Открыть инструкцию по талантам божественности",
    }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith("/divinity-talents/manual");

  fireEvent.press(screen.getByRole("button", { name: "Сбросить расчёт" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Выбрано нод: 0")).toBeTruthy();
    expect(screen.queryByText(/Самоцвет божественности/)).toBeNull();
  });
});

test("shows a nonblocking storage warning as an alert", async () => {
  render(<DivinityTalentScreen />);
  await waitForLoadedScreen();
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error("write failed"));

  fireEvent.press(screen.getByTestId("divinity-talent-node-center-1"));

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось сохранить изменения. Калькулятор продолжает работать.",
    );
  });
  expect(screen.getByLabelText("Выбрано нод: 1")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Сбросить расчёт" }),
  ).toBeTruthy();
});

test("failed reset clears local totals, warns and recovers on a later selection", async () => {
  render(<DivinityTalentScreen />);
  await waitForLoadedScreen();

  fireEvent.press(screen.getByTestId("divinity-talent-node-center-1"));
  await waitFor(() => {
    expect(screen.getByLabelText("Выбрано нод: 1")).toBeTruthy();
  });
  const initialWrite = jest.mocked(AsyncStorage.setItem).mock.results[0]
    ?.value as Promise<void> | undefined;
  expect(initialWrite).toBeDefined();
  await act(async () => {
    await initialWrite;
  });
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error("reset failed"));

  fireEvent.press(screen.getByRole("button", { name: "Сбросить расчёт" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Выбрано нод: 0")).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось сохранить изменения. Калькулятор продолжает работать.",
    );
  });

  fireEvent.press(screen.getByTestId("divinity-talent-node-center-2"));

  await waitFor(() => {
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3);
  });
  const recoveryWrite = jest.mocked(AsyncStorage.setItem).mock.results[2]
    ?.value as Promise<void> | undefined;
  expect(recoveryWrite).toBeDefined();
  await act(async () => {
    await recoveryWrite;
  });

  await waitFor(() => {
    expect(screen.getByLabelText("Выбрано нод: 1")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  const persistedRecord = JSON.parse(
    (await AsyncStorage.getItem("divinity-talents:v1")) ?? "null",
  ) as { selections?: unknown } | null;
  expect(persistedRecord?.selections).toEqual({
    left: null,
    center: { a: 2, b: 2, phase: "awaitingB" },
    right: null,
  });
});

test("keeps the fixed header and bottom content clear of safe areas", async () => {
  mockUseSafeAreaInsets.mockReturnValue({
    top: 12,
    right: 0,
    bottom: 34,
    left: 0,
  });

  render(<DivinityTalentScreen />);
  await waitForLoadedScreen();

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
