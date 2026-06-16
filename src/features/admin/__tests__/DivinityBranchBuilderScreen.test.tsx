import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { DivinityBranchBuilderScreen } from "../screens/DivinityBranchBuilderScreen";

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("DivinityBranchBuilderScreen", () => {
  const originalPlatform = Platform.OS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("renders builder controls and validates an incomplete form", () => {
    render(<DivinityBranchBuilderScreen />);

    expect(screen.getByText("Builder")).toBeTruthy();
    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select PvE build tab")).toBeTruthy();
    expect(screen.getByPlaceholderText("Имя героя")).toBeTruthy();
    expect(screen.getByLabelText("Добавить оружие")).toBeTruthy();
    expect(screen.getByLabelText("Добавить руну")).toBeTruthy();
    expect(screen.getByText("Пробуждение оружия")).toBeTruthy();
    expect(screen.getByLabelText("Weapon awakening slot 1, empty")).toBeTruthy();
    expect(screen.getAllByLabelText("Choose branch for левая")).toHaveLength(1);
    expect(screen.getAllByLabelText("Choose branch for центр")).toHaveLength(1);
    expect(screen.getAllByLabelText("Choose branch for правая")).toHaveLength(1);
    expect(screen.queryByText("левая")).toBeNull();
    expect(screen.queryByText("центр")).toBeNull();
    expect(screen.queryByText("правая")).toBeNull();
    expect(screen.queryByText("Asterial Skills")).toBeNull();
    expect(screen.queryByText("Psyche Skills")).toBeNull();
    expect(screen.queryByText("Immortality Skills")).toBeNull();
    expect(screen.queryByText("Devoid Skills")).toBeNull();
    expect(screen.queryByText("Primeval Skills")).toBeNull();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getAllByText("Divinity skill level").length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText("Скачать JSON"));

    expect(
      screen.getByText("Выберите цвет пробуждения оружия для слота 1."),
    ).toBeTruthy();
    expect(screen.getByText("Укажите имя героя.")).toBeTruthy();
    expect(screen.getByText("Выберите оружие.")).toBeTruthy();
    expect(screen.getByText("Выберите руну.")).toBeTruthy();
    expect(screen.getByText("Выберите ветку для левой колонки.")).toBeTruthy();
    expect(
      screen.getByText("Выберите крупный навык для центральной колонки на уровне 1."),
    ).toBeTruthy();
  });

  it("selects branch types from the grid column headers", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Имя героя"), "Western Queen");

    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    expect(screen.getByText("Psyche Skills")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));

    expect(screen.getByText("Psyche Skills")).toBeTruthy();
    expect(screen.getByLabelText("Psyche Skills icon")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));

    expect(screen.getByText("Energy Bubble")).toBeTruthy();
    expect(screen.queryByText("Maestro")).toBeNull();
    expect(screen.queryByText("Gemini")).toBeNull();
  });

  it("prefixes web branch header image paths with the configured base URL", () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    process.env.NODE_ENV = "production";

    const view = render(<DivinityBranchBuilderScreen />);

    const images = view.UNSAFE_getAllByType("img" as never);

    expect(images[0].props.src).toBe("/mh-calculator/img/branches/asterial.png");
  });
});
