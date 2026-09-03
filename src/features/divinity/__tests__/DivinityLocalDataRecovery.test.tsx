import { fireEvent, render, screen } from "@testing-library/react-native";

import { DivinityLocalDataRecovery } from "../ui/DivinityLocalDataRecovery";

test("shows the recovery message and invokes the selected action", () => {
  const onRetry = jest.fn();
  const onReset = jest.fn();

  render(
    <DivinityLocalDataRecovery
      isPending={false}
      onRetry={onRetry}
      onReset={onReset}
    />,
  );

  expect(screen.getByText("Ошибка загрузки локальных данных.")).toBeTruthy();
  expect(screen.getByRole("alert").type).toBe("Text");
  fireEvent.press(screen.getByRole("button", { name: "Повторить" }));
  fireEvent.press(screen.getByRole("button", { name: "Сбросить" }));

  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onReset).toHaveBeenCalledTimes(1);
});

test("blocks both recovery actions while an operation is pending", () => {
  const onRetry = jest.fn();
  const onReset = jest.fn();

  render(
    <DivinityLocalDataRecovery
      isPending
      onRetry={onRetry}
      onReset={onReset}
    />,
  );

  const retryButton = screen.getByRole("button", { name: "Повторить" });
  const resetButton = screen.getByRole("button", { name: "Сбросить" });
  expect(retryButton.props.accessibilityState.disabled).toBe(true);
  expect(resetButton.props.accessibilityState.disabled).toBe(true);

  fireEvent.press(retryButton);
  fireEvent.press(resetButton);
  expect(onRetry).not.toHaveBeenCalled();
  expect(onReset).not.toHaveBeenCalled();
});
