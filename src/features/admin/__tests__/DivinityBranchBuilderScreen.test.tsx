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
    expect(screen.getByPlaceholderText("Начните вводить имя героя")).toBeTruthy();
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

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(
      screen.getAllByText("Выберите цвет пробуждения оружия для слота 1.").length,
    ).toBeTruthy();
    expect(screen.getAllByText("Выберите героя из списка.").length).toBeTruthy();
    expect(screen.getAllByText("Выберите оружие.").length).toBeTruthy();
    expect(screen.getAllByText("Выберите руну.").length).toBeTruthy();
    expect(
      screen.getAllByText("Выберите ветку для левой колонки.").length,
    ).toBeTruthy();
    expect(
      screen.getAllByText(
        "Выберите крупный навык для центральной колонки на уровне 1.",
      ).length,
    ).toBeTruthy();
  });

  it("shows current tab validation messages next to related fields", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getAllByText("Выберите героя из списка.")).toHaveLength(2);
    expect(screen.getAllByText("Выберите оружие.")).toHaveLength(2);
    expect(screen.getAllByText("Выберите руну.")).toHaveLength(2);
    expect(
      screen.getAllByText("Выберите цвет пробуждения оружия для слота 1."),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Выберите ветку для левой колонки."),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Выберите крупный навык для центральной колонки на уровне 1."),
    ).toHaveLength(2);
  });

  it("shows save tab and full json download actions", () => {
    render(<DivinityBranchBuilderScreen />);

    expect(screen.getByText("Сохранить вкладку")).toBeTruthy();
    expect(screen.getByText("Скачать полный JSON")).toBeTruthy();
  });

  it("blocks full json download when target tabs are missing", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.press(screen.getByText("Скачать полный JSON"));

    expect(
      screen.getAllByText("PvP: Сохраните билд для этой вкладки.").length,
    ).toBeTruthy();
    expect(
      screen.getAllByText("PvE -> Боссы: Сохраните билд для этой вкладки.").length,
    ).toBeTruthy();
    expect(
      screen.getAllByText("PvE -> Кампания: Сохраните билд для этой вкладки.").length,
    ).toBeTruthy();
  });

  it("shows full export target tab errors above the target tabs", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.press(screen.getByText("Скачать полный JSON"));

    expect(
      screen.getAllByText("PvP: Сохраните билд для этой вкладки."),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("PvE -> Боссы: Сохраните билд для этой вкладки."),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("PvE -> Кампания: Сохраните билд для этой вкладки."),
    ).toHaveLength(2);
  });

  it("selects branch types from the grid column headers", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

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

  it("shows hero error if text was typed but no dropdown option was selected", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "бастет без выбора");
    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getAllByText("Выберите героя из списка.").length).toBeTruthy();
  });

  it("prefixes web branch header image paths with the configured base URL", () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    process.env.NODE_ENV = "production";

    const view = render(<DivinityBranchBuilderScreen />);

    const images = view.UNSAFE_getAllByType("img" as never);

    expect(images[0].props.src).toBe("/mh-calculator/img/branches/asterial.png");
  });

  it("shows active weapon bonus when hero is selected and two nodes share a color", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 2, empty"));

    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();
    expect(
      screen.getByText(
        "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
      ),
    ).toBeTruthy();
  });

  it("does not show weapon bonus when only one node of a color is selected", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));

    expect(screen.queryByText("Активные бонусы цветов")).toBeNull();
  });

  it("hides weapon bonus when hero query changes without catalog selection", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 2, empty"));
    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText("Начните вводить имя героя"),
      "бастет без выбора",
    );

    expect(screen.queryByText("Активные бонусы цветов")).toBeNull();
  });
});
