const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  __esModule: true,
  router: {
    back: () => mockRouter.back(),
    canGoBack: () => mockRouter.canGoBack(),
    replace: (href: string) => mockRouter.replace(href),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import { CalculatorManualScreen } from "../CalculatorManualScreen";

describe("CalculatorManualScreen", () => {
  afterEach(() => {
    mockRouter.back.mockReset();
    mockRouter.canGoBack.mockReset();
    mockRouter.canGoBack.mockReturnValue(true);
    mockRouter.replace.mockReset();
  });

  it("renders the introductory copy and every declarative section field", () => {
    render(
      <CalculatorManualScreen
        fallbackHref="/calculator"
        intro="Вводный текст."
        sections={[
          {
            title: "Первый раздел",
            intro: ["Первый абзац.", "Второй абзац."],
            items: ["Первый пункт.", "Второй пункт."],
            footer: "Подвал раздела.",
          },
          { title: "Второй раздел" },
        ]}
        title="Как пользоваться"
      />,
    );

    expect(screen.getByText("Как пользоваться")).toBeTruthy();
    expect(screen.getByText("Вводный текст.")).toBeTruthy();
    expect(screen.getByText("Первый раздел")).toBeTruthy();
    expect(screen.getByText("Первый абзац.")).toBeTruthy();
    expect(screen.getByText("Второй абзац.")).toBeTruthy();
    expect(screen.getByText("Первый пункт.")).toBeTruthy();
    expect(screen.getByText("Второй пункт.")).toBeTruthy();
    expect(screen.getByText("Подвал раздела.")).toBeTruthy();
    expect(screen.getByText("Второй раздел")).toBeTruthy();
  });

  it("uses fallbackHref when the shared header cannot return through history", () => {
    mockRouter.canGoBack.mockReturnValue(false);

    render(
      <CalculatorManualScreen
        fallbackHref="/calculator"
        intro="Вводный текст."
        sections={[]}
      />,
    );

    fireEvent.press(screen.getByLabelText("Назад"));

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/calculator");
  });
});
