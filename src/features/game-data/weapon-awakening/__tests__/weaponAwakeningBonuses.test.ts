import type { WeaponAwakeningSlotSelection } from "@/features/admin/types/admin.types";
import type { Hero } from "@/features/heroes/types/heroes.types";

import {
  countWeaponAwakeningColors,
  getIconicWeaponHeroClass,
  getWeaponAwakeningActiveBonuses,
} from "@/features/game-data/weapon-awakening/weaponAwakeningBonuses";
import type { WeaponAwakeningActiveBonus, WeaponAwakeningComboRule } from "../types";

const tankHero: Hero = {
  id: "tank-hero",
  name: { en: "Tank", ru: "Танк" },
  icon: "/img/heroes/tank.png",
  rarity: "ssr",
  role: "tank",
  damageType: "physical",
  element: "earth",
  factions: ["guardian"],
  releaseDate: null,
};

const supportHero: Hero = {
  ...tankHero,
  id: "support-hero",
  role: "support",
};

const physicalFighterHero: Hero = {
  ...tankHero,
  id: "fighter-hero",
  role: "fighter",
  damageType: "physical",
};

const magicalFighterHero: Hero = {
  ...tankHero,
  id: "mage-hero",
  role: "mage",
  damageType: "magical",
};

const sampleRule: WeaponAwakeningComboRule = {
  heroClass: "physical-fighter",
  color: "blue",
  values: [4, 12, 32],
  description: {
    en: "For the Hero directly opposed to this Hero in the enemy's formation, Physical Damage taken is increased by {value}%.",
  },
};

const greenRule: WeaponAwakeningComboRule = {
  heroClass: "physical-fighter",
  color: "green",
  values: [3, 9, 24],
  description: {
    en: "If any allied frontline Hero is still alive, this Hero's damage taken is reduced by {value}%.",
  },
};

const redRule: WeaponAwakeningComboRule = {
  heroClass: "physical-fighter",
  color: "red",
  values: [4.5, 13.5, 36],
  description: {
    en: "Whenever this Hero's Health is below 50%, their Lifesteal increases by {value}%.",
  },
};

const thresholds = [2, 4, 8] as const;

function selections(
  entries: Array<[number, WeaponAwakeningSlotSelection["colorId"]]>,
): WeaponAwakeningSlotSelection[] {
  return entries.map(([slot, colorId]) => ({ slot, colorId }));
}

describe("getIconicWeaponHeroClass", () => {
  test("maps tank hero to tank", () => {
    expect(getIconicWeaponHeroClass(tankHero)).toBe("tank");
  });

  test("maps support hero to support", () => {
    expect(getIconicWeaponHeroClass(supportHero)).toBe("support");
  });

  test("maps physical fighter to physical-fighter", () => {
    expect(getIconicWeaponHeroClass(physicalFighterHero)).toBe("physical-fighter");
  });

  test("maps magical mage to magical-fighter", () => {
    expect(getIconicWeaponHeroClass(magicalFighterHero)).toBe("magical-fighter");
  });
});

describe("getWeaponAwakeningActiveBonuses", () => {
  test("returns no bonuses for one red, one blue, one green", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: "physical-fighter",
      selections: selections([
        [1, "red"],
        [2, "blue"],
        [3, "green"],
      ]),
      rules: [redRule, sampleRule, greenRule],
      thresholds,
    });

    expect(result).toEqual([]);
  });

  test("returns one tier-2 bonus for two same-color nodes", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: "physical-fighter",
      selections: selections([
        [1, "red"],
        [2, "red"],
      ]),
      rules: [redRule],
      thresholds,
    });

    expect(result).toEqual([
      {
        color: "red",
        count: 2,
        threshold: 2,
        value: 4.5,
        description:
          "Whenever this Hero's Health is below 50%, their Lifesteal increases by 4.5%.",
      },
    ]);
  });

  test("returns tier-4 bonus for four same-color nodes", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: "physical-fighter",
      selections: selections([
        [1, "blue"],
        [2, "blue"],
        [3, "blue"],
        [4, "blue"],
      ]),
      rules: [sampleRule],
      thresholds,
    });

    expect(result).toEqual([
      {
        color: "blue",
        count: 4,
        threshold: 4,
        value: 12,
        description:
          "For the Hero directly opposed to this Hero in the enemy's formation, Physical Damage taken is increased by 12%.",
      },
    ]);
  });

  test("returns tier-8 bonus for eight same-color nodes", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: "physical-fighter",
      selections: selections([
        [1, "green"],
        [2, "green"],
        [3, "green"],
        [4, "green"],
        [5, "green"],
        [6, "green"],
        [7, "green"],
        [8, "green"],
      ]),
      rules: [greenRule],
      thresholds,
    });

    expect(result).toEqual([
      {
        color: "green",
        count: 8,
        threshold: 8,
        value: 24,
        description:
          "If any allied frontline Hero is still alive, this Hero's damage taken is reduced by 24%.",
      },
    ]);
  });

  test("returns multiple tier-2 bonuses for 2 red + 2 blue", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: "physical-fighter",
      selections: selections([
        [1, "red"],
        [2, "red"],
        [3, "blue"],
        [4, "blue"],
      ]),
      rules: [redRule, sampleRule],
      thresholds,
    });

    expect(result).toEqual([
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
        count: 2,
        threshold: 2,
        value: 4,
        description:
          "For the Hero directly opposed to this Hero in the enemy's formation, Physical Damage taken is increased by 4%.",
      },
    ]);
  });

  test("sorts bonuses by color order", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: "physical-fighter",
      selections: selections([
        [1, "purple"],
        [2, "purple"],
        [3, "red"],
        [4, "red"],
      ]),
      rules: [
        {
          heroClass: "physical-fighter",
          color: "purple",
          values: [1.5, 4.5, 12],
          description: {
            en: "Increase the Attack of allied Heroes on the same formational line by {value}%.",
          },
        },
        redRule,
      ],
      thresholds,
    });

    expect(result.map((bonus: WeaponAwakeningActiveBonus) => bonus.color)).toEqual([
      "red",
      "purple",
    ]);
  });

  test("returns no bonuses when hero class is null", () => {
    const result = getWeaponAwakeningActiveBonuses({
      heroClass: null,
      selections: selections([
        [1, "red"],
        [2, "red"],
      ]),
      rules: [redRule],
      thresholds,
    });

    expect(result).toEqual([]);
  });
});

describe("countWeaponAwakeningColors", () => {
  test("counts selected colors by id", () => {
    expect(
      countWeaponAwakeningColors(
        selections([
          [1, "red"],
          [2, "red"],
          [3, "blue"],
        ]),
      ),
    ).toEqual({ red: 2, blue: 1 });
  });
});
