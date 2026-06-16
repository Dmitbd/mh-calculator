import { fireEvent, render, screen } from "@testing-library/react-native";

import { EquipmentVariantBuilder } from "../components/EquipmentVariantBuilder";

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

describe("EquipmentVariantBuilder", () => {
  test("renders add controls for empty selection", () => {
    render(
      <EquipmentVariantBuilder
        addLabel="Добавить оружие"
        label="Оружие"
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        options={options}
        selectedIds={[]}
      />,
    );

    expect(screen.getByLabelText("Добавить оружие")).toBeTruthy();
  });

  test("adding a weapon shows it in selected variants", () => {
    const onAdd = jest.fn();

    render(
      <EquipmentVariantBuilder
        addLabel="Добавить оружие"
        label="Оружие"
        onAdd={onAdd}
        onRemove={jest.fn()}
        options={options}
        selectedIds={[]}
      />,
    );

    fireEvent.press(screen.getByLabelText("Добавить оружие"));
    fireEvent.press(screen.getByLabelText("Add Axe of Pangu"));

    expect(onAdd).toHaveBeenCalledWith("axe-of-pangu");
  });

  test("removing a weapon calls onRemove", () => {
    const onRemove = jest.fn();

    render(
      <EquipmentVariantBuilder
        addLabel="Добавить оружие"
        label="Оружие"
        onAdd={jest.fn()}
        onRemove={onRemove}
        options={options}
        selectedIds={["axe-of-pangu"]}
      />,
    );

    fireEvent.press(screen.getByLabelText("Remove Axe of Pangu"));

    expect(onRemove).toHaveBeenCalledWith("axe-of-pangu");
  });
});
