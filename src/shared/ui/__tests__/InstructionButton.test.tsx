import { fireEvent, render, screen } from "@testing-library/react-native";

import { InstructionButton } from "../InstructionButton";

describe("InstructionButton", () => {
  it("renders its question mark, title, accessible button and invokes the action", () => {
    const onPress = jest.fn();

    render(
      <InstructionButton
        accessibilityLabel="Открыть справку"
        onPress={onPress}
        title="Справка"
      />,
    );

    expect(screen.getByText("?")).toBeTruthy();
    expect(screen.getByText("Справка")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Открыть справку" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses the instruction title by default", () => {
    render(<InstructionButton accessibilityLabel="Открыть инструкцию" onPress={() => {}} />);

    expect(screen.getByText("Инструкция")).toBeTruthy();
  });
});
