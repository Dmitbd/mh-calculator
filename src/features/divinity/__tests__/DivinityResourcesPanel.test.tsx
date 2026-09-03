jest.mock("@/shared/lib/resolveAssetUri", () => ({
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Image } from "react-native";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
import { DivinityResourcesPanel } from "../ui/DivinityResourcesPanel";

test("reveals real chest assets and resource controls", () => {
  const onSetChest = jest.fn();
  const onSetGem = jest.fn();
  const onReset = jest.fn();

  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onSetChest={onSetChest}
      onSetGem={onSetGem}
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
  const imageUris = screen
    .UNSAFE_getAllByType(Image)
    .map((image) => image.props.source.uri);
  expect(imageUris).toContain(
    "resolved:/img/divinity/chests/chest-600001.png",
  );
  expect(imageUris).toContain(
    "resolved:/img/divinity/chests/chest-600076.png",
  );
  expect(
    screen.getByTestId("divinity-chest-icon-600001-placeholder"),
  ).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Сбросить мои ресурсы"));

  expect(onSetChest).not.toHaveBeenCalled();
  expect(onSetGem).not.toHaveBeenCalled();
  expect(onReset).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByLabelText("Свернуть мои ресурсы"));
  expect(screen.queryByText("Сундуки")).toBeNull();
});

test("keeps the narrow chevron when the resources panel changes state", () => {
  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onSetChest={jest.fn()}
      onSetGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  expect(screen.getByTestId("divinity-resources-chevron").props.children).toBe(
    "›",
  );
  expect(screen.queryByText("⌄")).toBeNull();
  expect(screen.queryByText("⌃")).toBeNull();

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));

  expect(screen.getByTestId("divinity-resources-chevron").props.children).toBe(
    "›",
  );
});

test("keeps input as a draft until save and clears a saved value", () => {
  const onSetChest = jest.fn();
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600076"] = 8;

  const { rerender } = render(
    <DivinityResourcesPanel
      resources={resources}
      onSetChest={onSetChest}
      onSetGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  const input = screen.getByLabelText("Количество сундуков 600076");

  expect(input.props.value).toBe("8");
  expect(input.props.inputMode).toBe("numeric");
  expect(input.props.keyboardType).toBe("number-pad");

  fireEvent.changeText(input, "a12b34");
  expect(
    screen.getByLabelText("Количество сундуков 600076").props.value,
  ).toBe("123");
  expect(onSetChest).not.toHaveBeenCalled();

  fireEvent.press(screen.getByLabelText("Сохранить сундуки 600076"));
  expect(onSetChest).toHaveBeenCalledWith("600076", 123);

  const savedResources = createEmptyDivinityOwnedResources();
  savedResources.chestCounts["600076"] = 123;
  rerender(
    <DivinityResourcesPanel
      resources={savedResources}
      onSetChest={onSetChest}
      onSetGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  expect(screen.queryByLabelText("Сохранить сундуки 600076")).toBeNull();
  fireEvent.press(screen.getByLabelText("Очистить сундуки 600076"));
  expect(onSetChest).toHaveBeenLastCalledWith("600076", 0);
});

test("saves an empty gem input as zero", () => {
  const onSetGem = jest.fn();

  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onSetChest={jest.fn()}
      onSetGem={onSetGem}
      onReset={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  fireEvent.changeText(
    screen.getByLabelText("Количество самоцветов 7 ур."),
    "",
  );
  fireEvent.press(screen.getByLabelText("Сохранить самоцветы 7 ур."));

  expect(onSetGem).toHaveBeenCalledWith(7, 0);
});

test("resets an unconfirmed draft when the panel is collapsed", () => {
  const resources = createEmptyDivinityOwnedResources();
  resources.chestCounts["600001"] = 8;

  render(
    <DivinityResourcesPanel
      resources={resources}
      onSetChest={jest.fn()}
      onSetGem={jest.fn()}
      onReset={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  fireEvent.changeText(
    screen.getByLabelText("Количество сундуков 600001"),
    "12",
  );
  expect(screen.getByLabelText("Сохранить сундуки 600001")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Свернуть мои ресурсы"));
  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));

  expect(
    screen.getByLabelText("Количество сундуков 600001").props.value,
  ).toBe("8");
  expect(screen.queryByLabelText("Сохранить сундуки 600001")).toBeNull();
});

test("resets an unconfirmed draft when owned resources are reset", () => {
  const onReset = jest.fn();

  render(
    <DivinityResourcesPanel
      resources={createEmptyDivinityOwnedResources()}
      onSetChest={jest.fn()}
      onSetGem={jest.fn()}
      onReset={onReset}
    />,
  );

  fireEvent.press(screen.getByLabelText("Раскрыть мои ресурсы"));
  fireEvent.changeText(
    screen.getByLabelText("Количество сундуков 600001"),
    "12",
  );
  expect(screen.getByLabelText("Сохранить сундуки 600001")).toBeTruthy();

  fireEvent.press(screen.getByLabelText("Сбросить мои ресурсы"));

  expect(
    screen.getByLabelText("Количество сундуков 600001").props.value,
  ).toBe("0");
  expect(screen.queryByLabelText("Сохранить сундуки 600001")).toBeNull();
  expect(onReset).toHaveBeenCalledTimes(1);
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
