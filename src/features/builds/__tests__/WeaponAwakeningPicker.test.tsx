import { render, screen } from "@testing-library/react-native";

import { WeaponAwakeningPicker } from "../components/WeaponAwakeningPicker";

const colors = [
  {
    id: "red" as const,
    label: "Красный",
    order: 1,
    color: "#c94848",
    icon: "/img/weapon-awakening/red.png",
  },
];

const slots = [{ slot: 1 }];

test("loads a responsive color icon without duplicating the slot label", () => {
  render(
    <WeaponAwakeningPicker
      colors={colors}
      selections={{ 1: "red" }}
      slots={slots}
    />,
  );

  expect(screen.getByLabelText("Weapon awakening slot 1, Красный")).toBeTruthy();
  const image = screen.getByTestId("weapon-awakening-slot-icon-1");
  expect(image.props.accessible).toBe(false);
  expect(image.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ height: "100%", width: "100%" })]),
  );
  expect(
    screen.getByTestId("weapon-awakening-slot-icon-1-placeholder"),
  ).toBeTruthy();
});
jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
