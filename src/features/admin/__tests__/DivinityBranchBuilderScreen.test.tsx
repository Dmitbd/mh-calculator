import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, ScrollView } from "react-native";

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

  function renderAdminBuilder() {
    return render(
      <DivinityBranchBuilderScreen
        initialAdminSession={{ email: "admin@example.com" }}
      />,
    );
  }

  it("renders builder controls and validates an incomplete form", () => {
    renderAdminBuilder();

    expect(screen.getByText("Builder")).toBeTruthy();
    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select PvE build tab")).toBeTruthy();
    expect(screen.getByPlaceholderText("Начните вводить имя героя")).toBeTruthy();
    expect(screen.getByLabelText("Добавить оружие")).toBeTruthy();
    expect(screen.getByLabelText("Добавить руну")).toBeTruthy();
    expect(screen.getByText("Пробуждение оружия")).toBeTruthy();
    expect(
      screen.getByText("Кликайте по кружку, чтобы менять его цвет."),
    ).toBeTruthy();
    expect(screen.getByText("Навыки божественности")).toBeTruthy();
    expect(
      screen.getByText("Таланты берутся из выбранных в дереве ниже."),
    ).toBeTruthy();
    expect(
      screen.getByText("Добавить навыки для 7 божественных узлов"),
    ).toBeTruthy();
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
    renderAdminBuilder();

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

  it("shows only save tab and publish actions in the builder footer", () => {
    renderAdminBuilder();

    expect(screen.getByText("Сохранить вкладку")).toBeTruthy();
    expect(screen.getByText("Опубликовать")).toBeTruthy();
    expect(screen.queryByText("Скачать полный JSON")).toBeNull();
    expect(screen.queryByText("Загрузить билд")).toBeNull();
    expect(screen.queryByText("Сохранить черновик")).toBeNull();
    expect(screen.queryByText("Удалить билд")).toBeNull();
  });

  it("hides builder controls until admin signs in", () => {
    render(<DivinityBranchBuilderScreen initialAdminSession={null} />);

    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
    expect(screen.queryByLabelText("Select PvP build tab")).toBeNull();
    expect(screen.queryByText("Сохранить вкладку")).toBeNull();
    expect(screen.queryByText("Опубликовать")).toBeNull();
  });

  it("keeps equipment selections independent between target tabs", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Добавить оружие"));
    fireEvent.press(screen.getByLabelText("Add Excalibur"));

    expect(screen.getByText("Excalibur")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));

    expect(screen.queryByText("Excalibur")).toBeNull();

    fireEvent.press(screen.getByLabelText("Select PvP build tab"));

    expect(screen.getByText("Excalibur")).toBeTruthy();
  });

  it("blocks full json download when target tabs are missing", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Опубликовать"));

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
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Опубликовать"));

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

  it("scrolls to the top when full export has target tab errors", () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, "scrollTo");

    renderAdminBuilder();

    fireEvent.press(screen.getByText("Опубликовать"));

    expect(scrollToSpy).toHaveBeenCalledWith({ animated: true, y: 0 });

    scrollToSpy.mockRestore();
  });

  it("clears fixed field errors while the form is being filled", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getAllByText("Выберите героя из списка.")).toHaveLength(2);

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));

    expect(screen.queryByText("Выберите героя из списка.")).toBeNull();
    expect(screen.getAllByText("Выберите оружие.")).toHaveLength(2);
  });

  it("selects branch types from the grid column headers", () => {
    renderAdminBuilder();

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

  it("asks to select tree talents before opening divinity skill options", () => {
    renderAdminBuilder();

    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );

    expect(
      screen.getByText("Выберите хотя бы один талант в дереве ниже."),
    ).toBeTruthy();
    expect(screen.queryByText("Aurora")).toBeNull();
  });

  it("shows only selected tree talents in divinity skill options", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );

    expect(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    ).toBeTruthy();
    expect(screen.queryByText("Aurora")).toBeNull();
    expect(screen.queryByText("Energy Bubble")).toBeNull();
    expect(
      screen.queryByText(
        "Выберите все 3 ветки дерева, чтобы открыть список навыков божественности.",
      ),
    ).toBeNull();
  });

  it("adds each selected tree talent to divinity skill options", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));
    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));
    fireEvent.press(screen.getByLabelText("Select Energy Bubble for center level 1"));
    fireEvent.press(screen.getByLabelText("Choose branch for правая"));
    fireEvent.press(screen.getByLabelText("Select Immortality Skills for правая"));
    fireEvent.press(screen.getByLabelText("Choose skill for right level 3"));
    fireEvent.press(screen.getByLabelText("Select Eterna for right level 3"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );

    expect(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Выбрать навык божественности Energy Bubble"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Выбрать навык божественности Eterna"),
    ).toBeTruthy();
    expect(screen.queryByText("Aurora")).toBeNull();
    expect(screen.queryByText("Animus")).toBeNull();
  });

  it("shows a toast when changing a branch clears divinity skills", () => {
    renderAdminBuilder();

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Asterial Skills for левая"));
    fireEvent.press(screen.getByLabelText("Choose skill for left level 3"));
    fireEvent.press(screen.getByLabelText("Select Gemini for left level 3"));
    fireEvent.press(screen.getByLabelText("Choose branch for центр"));
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for центр"));
    fireEvent.press(screen.getByLabelText("Choose branch for правая"));
    fireEvent.press(screen.getByLabelText("Select Immortality Skills for правая"));
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности 6 узлов, слот 1"),
    );
    fireEvent.press(
      screen.getByLabelText("Выбрать навык божественности Gemini"),
    );

    fireEvent.press(screen.getByLabelText("Choose branch for левая"));
    fireEvent.press(screen.getByLabelText("Select Devoid Skills for левая"));

    expect(
      screen.getAllByText("\"Навыки божественности\" были сброшены").length,
    ).toBeTruthy();
  });

  it("shows hero error if text was typed but no dropdown option was selected", () => {
    renderAdminBuilder();

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "бастет без выбора");
    fireEvent.press(screen.getByText("Сохранить вкладку"));

    expect(screen.getAllByText("Выберите героя из списка.").length).toBeTruthy();
  });

  it("prefixes web branch header image paths with the configured base URL", () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    process.env.NODE_ENV = "production";

    const view = renderAdminBuilder();

    const images = view.UNSAFE_getAllByType("img" as never);

    expect(images[0].props.src).toBe("/mh-calculator/img/branches/asterial.png");
  });

  it("shows active weapon bonus when hero is selected and two nodes share a color", () => {
    renderAdminBuilder();

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
    renderAdminBuilder();

    fireEvent.changeText(screen.getByPlaceholderText("Начните вводить имя героя"), "bastet");
    fireEvent.press(screen.getByLabelText("Выбрать героя Бастет"));
    fireEvent.press(screen.getByLabelText("Weapon awakening slot 1, empty"));

    expect(screen.queryByText("Активные бонусы цветов")).toBeNull();
  });

  it("hides weapon bonus when hero query changes without catalog selection", () => {
    renderAdminBuilder();

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
