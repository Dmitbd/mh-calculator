import { fireEvent, render, screen } from "@testing-library/react-native";

import { EquipmentVariantTabs } from "../components/EquipmentVariantTabs";

const options = [
  {
    id: "axe-of-pangu",
    name: "Axe of Pangu",
    icon: "/img/equipment/artifacts/axe-of-pangu.png",
    description: "Axe description",
  },
  {
    id: "staff-of-sharur",
    name: "Staff of Sharur",
    icon: "/img/equipment/artifacts/staff-of-sharur.png",
    description: "Staff description",
  },
];

const runeOptions = [
  {
    id: "air",
    name: "Air Rune",
    icon: "/img/equipment/runes/air.png",
    description: "Air description",
    elementalResonance: "Air resonance",
  },
  {
    id: "fire",
    name: "Fire Rune",
    icon: "/img/equipment/runes/fire.png",
    description: "Fire description",
    elementalResonance: "Fire resonance",
  },
];

describe("EquipmentVariantTabs", () => {
  test("renders all weapon variants and defaults to first description", () => {
    render(
      <EquipmentVariantTabs
        label="Оружие"
        options={options}
        selectedIds={["axe-of-pangu", "staff-of-sharur"]}
      />,
    );

    expect(screen.getByText("Axe of Pangu")).toBeTruthy();
    expect(screen.getByText("Staff of Sharur")).toBeTruthy();
    expect(screen.getByText("Axe description")).toBeTruthy();
    expect(screen.queryByText("Staff description")).toBeNull();
  });

  test("tapping another weapon changes only weapon description", () => {
    render(
      <EquipmentVariantTabs
        label="Оружие"
        options={options}
        selectedIds={["axe-of-pangu", "staff-of-sharur"]}
      />,
    );

    fireEvent.press(screen.getByLabelText("Select Staff of Sharur"));

    expect(screen.getByText("Staff description")).toBeTruthy();
    expect(screen.queryByText("Axe description")).toBeNull();
  });

  test("tapping another rune changes only rune description", () => {
    render(
      <EquipmentVariantTabs
        label="Руны"
        options={runeOptions}
        selectedIds={["air", "fire"]}
      />,
    );

    expect(screen.getByText("Air description")).toBeTruthy();
    expect(screen.getByText("Elemental Resonance — Air resonance")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select Fire Rune"));

    expect(screen.getByText("Fire description")).toBeTruthy();
    expect(screen.getByText("Elemental Resonance — Fire resonance")).toBeTruthy();
    expect(screen.queryByText("Air description")).toBeNull();
  });
});

jest.mock("@/shared/ui/useImageLoadingTransition", () =>
  jest.requireActual("@/shared/ui/testing/stableImageLoadingTransition"),
);
