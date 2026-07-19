jest.mock("@/shared/lib/resolveAssetUri", () => ({
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import { DivinityResourcesPanel } from "../ui/DivinityResourcesPanel";

test("reveals real chest assets and resource controls", () => {
  const onIncrementChest = jest.fn();
  const onIncrementGem = jest.fn();
  const onReset = jest.fn();

  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onDecrementChest={jest.fn()}
      onDecrementGem={jest.fn()}
      onIncrementChest={onIncrementChest}
      onIncrementGem={onIncrementGem}
      onReset={onReset}
    />,
  );

  expect(screen.getByText("Мои ресурсы")).toBeTruthy();
  expect(screen.queryByText("Сундуки")).toBeNull();

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));

  expect(screen.getByText("Сундуки")).toBeTruthy();
  expect(screen.getByText("Самоцветы")).toBeTruthy();
  expect(screen.getByText("1–5 ур.")).toBeTruthy();
  expect(screen.getByText("6–7 ур.")).toBeTruthy();
  expect(
    screen.getByLabelText("Персон. сундук с самоцветом божественности").props
      .source,
  ).toEqual({
    uri: "resolved:/img/divinity/chests/chest-600001.png",
  });
  expect(
    screen.getByLabelText(
      "Большой персонализированный сундук с самоцветом божественности",
    ).props.source,
  ).toEqual({
    uri: "resolved:/img/divinity/chests/chest-600076.png",
  });

  fireEvent.press(screen.getByLabelText("Добавить сундук 600001"));
  fireEvent.press(screen.getByLabelText("Добавить самоцвет 7 ур."));
  fireEvent.press(screen.getByLabelText("Сбросить мои ресурсы"));

  expect(onIncrementChest).toHaveBeenCalledWith("600001");
  expect(onIncrementGem).toHaveBeenCalledWith(7);
  expect(onReset).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByLabelText("Свернуть мои ресурсы"));
  expect(screen.queryByText("Сундуки")).toBeNull();
});

test("uses the project chevron pair for collapsed and expanded states", () => {
  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onDecrementChest={jest.fn()}
      onDecrementGem={jest.fn()}
      onIncrementChest={jest.fn()}
      onIncrementGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  expect(screen.getByTestId("divinity-resources-chevron").props.children).toBe(
    "▾",
  );
  expect(screen.queryByText("⌄")).toBeNull();
  expect(screen.queryByText("⌃")).toBeNull();

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));

  expect(screen.getByTestId("divinity-resources-chevron").props.children).toBe(
    "▴",
  );
});
