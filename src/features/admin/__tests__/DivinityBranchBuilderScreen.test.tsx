import { fireEvent, render, screen } from "@testing-library/react-native";

import { DivinityBranchBuilderScreen } from "../screens/DivinityBranchBuilderScreen";

describe("DivinityBranchBuilderScreen", () => {
  it("renders builder controls and validates an incomplete form", () => {
    render(<DivinityBranchBuilderScreen />);

    expect(screen.getByText("Divinity Branch Builder")).toBeTruthy();
    expect(screen.getByLabelText("Select PvP mode")).toBeTruthy();
    expect(screen.getByLabelText("Select PvE mode")).toBeTruthy();
    expect(screen.getByPlaceholderText("Hero name")).toBeTruthy();
    expect(screen.getByText("Пробуждение оружия")).toBeTruthy();
    expect(screen.getByLabelText("Weapon awakening slot 1, empty")).toBeTruthy();
    expect(screen.getAllByText("Left branch")).toHaveLength(1);
    expect(screen.getAllByText("Center main branch")).toHaveLength(1);
    expect(screen.getAllByText("Right branch")).toHaveLength(1);
    expect(screen.queryByText("Asterial Skills")).toBeNull();
    expect(screen.queryByText("Psyche Skills")).toBeNull();
    expect(screen.queryByText("Immortality Skills")).toBeNull();
    expect(screen.queryByText("Devoid Skills")).toBeNull();
    expect(screen.queryByText("Primeval Skills")).toBeNull();
    expect(screen.getByText("Lv. 1")).toBeTruthy();
    expect(screen.getAllByText("Divinity skill level").length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText("Проверить JSON"));

    expect(
      screen.getByText("Weapon awakening color is required for slot 1."),
    ).toBeTruthy();
    expect(screen.getByText("Hero name is required.")).toBeTruthy();
    expect(screen.getByText("Branch is required for left.")).toBeTruthy();
    expect(screen.getByText("Major skill is required for center level 1.")).toBeTruthy();
  });

  it("selects branch types from the grid column headers", () => {
    render(<DivinityBranchBuilderScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Hero name"), "Western Queen");

    fireEvent.press(screen.getByLabelText("Choose branch for Center main branch"));
    expect(screen.getByText("Psyche Skills")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select Psyche Skills for Center main branch"));

    expect(screen.getByText("Psyche Skills")).toBeTruthy();
    expect(screen.getByLabelText("Psyche Skills icon")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Choose skill for center level 1"));

    expect(screen.getByText("Maestro")).toBeTruthy();
    expect(screen.queryByText("Gemini")).toBeNull();
  });
});
