const mockUseSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));

jest.mock("react-native-safe-area-context", () => ({
  __esModule: true,
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import { HeroBuildScreen } from "@/features/heroes/screens/HeroBuildScreen";

describe("HeroBuildScreen", () => {
  test("renders top-level folder tabs for bastet", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByLabelText("Select PvP build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select PvE build tab")).toBeTruthy();
  });

  test("defaults to the first ready build path", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });

  test("renders PvE child tabs when PvE is active", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));

    expect(screen.getByLabelText("Select Боссы build tab")).toBeTruthy();
    expect(screen.getByLabelText("Select Кампания build tab")).toBeTruthy();
  });

  test("shows placeholder for an empty selected tab", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));
    fireEvent.press(screen.getByLabelText("Select Боссы build tab"));

    expect(screen.getByText("Билд для этого режима ещё не готов.")).toBeTruthy();
  });

  test("renders build content after switching back to PvP tab", () => {
    render(<HeroBuildScreen heroId="bastet" />);

    fireEvent.press(screen.getByLabelText("Select PvE build tab"));
    fireEvent.press(screen.getByLabelText("Select PvP build tab"));

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
  });
});
