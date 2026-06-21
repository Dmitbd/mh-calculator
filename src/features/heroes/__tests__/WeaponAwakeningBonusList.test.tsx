import { render, screen } from "@testing-library/react-native";

import type { WeaponAwakeningColor } from "@/features/game-data/weapon-awakening/types";

import { WeaponAwakeningBonusList } from "../components/WeaponAwakeningBonusList";

const colors: WeaponAwakeningColor[] = [
  {
    id: "red",
    label: "Красный",
    order: 1,
    color: "#c94848",
    icon: "/img/weapon-awakening/red.png",
  },
  {
    id: "blue",
    label: "Синий",
    order: 4,
    color: "#4a7fd4",
    icon: "/img/weapon-awakening/blue.png",
  },
];

describe("WeaponAwakeningBonusList", () => {
  test("renders nothing for empty bonuses", () => {
    const view = render(<WeaponAwakeningBonusList bonuses={[]} colors={colors} />);

    expect(view.toJSON()).toBeNull();
  });

  test("renders color name, tier and description for active bonus", () => {
    render(
      <WeaponAwakeningBonusList
        bonuses={[
          {
            color: "red",
            count: 2,
            threshold: 2,
            value: 4.5,
            description:
              "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
          },
        ]}
        colors={colors}
      />,
    );

    expect(screen.getByText("Активные бонусы цветов")).toBeTruthy();
    expect(screen.getByText(/Красный/)).toBeTruthy();
    expect(screen.getByText(/2\/8/)).toBeTruthy();
    expect(screen.getByText(/Бонус за 2 ноды/)).toBeTruthy();
    expect(
      screen.getByText(
        "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
      ),
    ).toBeTruthy();
  });

  test("renders several bonuses when supplied", () => {
    render(
      <WeaponAwakeningBonusList
        bonuses={[
          {
            color: "red",
            count: 2,
            threshold: 2,
            value: 4.5,
            description:
              "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
          },
          {
            color: "blue",
            count: 4,
            threshold: 4,
            value: 12,
            description:
              "For the Hero directly opposed to this Hero in the enemy's formation, Physical Damage taken is increased by 12%.",
          },
        ]}
        colors={colors}
      />,
    );

    expect(screen.getByText(/Красный/)).toBeTruthy();
    expect(screen.getByText(/Синий/)).toBeTruthy();
    expect(screen.getByText(/Бонус за 4 ноды/)).toBeTruthy();
  });
});
