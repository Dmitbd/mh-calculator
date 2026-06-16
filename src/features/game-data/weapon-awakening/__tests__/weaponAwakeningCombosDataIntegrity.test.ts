import colorsData from "../weapon-awakening-colors.json";
import combosData from "../weapon-awakening-combos.json";
import type { WeaponAwakeningColor } from "@/features/admin/types/admin.types";

import type { IconicWeaponHeroClass, WeaponAwakeningCombosData } from "../types";

const colors = colorsData as WeaponAwakeningColor[];
const combos = combosData as WeaponAwakeningCombosData;

const heroClasses: IconicWeaponHeroClass[] = [
  "tank",
  "physical-fighter",
  "magical-fighter",
  "support",
];

const colorIds = new Set(colors.map((color) => color.id));

describe("weapon-awakening-combos.json", () => {
  test("has schema version 1", () => {
    expect(combos.schemaVersion).toBe(1);
  });

  test("thresholds are [2, 4, 8]", () => {
    expect(combos.thresholds).toEqual([2, 4, 8]);
  });

  test("colors referenced by combos exist", () => {
    for (const rule of combos.combos) {
      expect(colorIds.has(rule.color)).toBe(true);
    }
  });

  test("all 4 hero classes have all 5 colors", () => {
    for (const heroClass of heroClasses) {
      const classColors = combos.combos
        .filter((rule) => rule.heroClass === heroClass)
        .map((rule) => rule.color);

      expect(new Set(classColors).size).toBe(5);
      expect(classColors.length).toBe(5);
    }
  });

  test("values length matches thresholds length", () => {
    for (const rule of combos.combos) {
      expect(rule.values).toHaveLength(combos.thresholds.length);
    }
  });

  test("there is exactly one rule for every heroClass and color pair", () => {
    const pairs = combos.combos.map((rule) => `${rule.heroClass}:${rule.color}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(pairs.length).toBe(heroClasses.length * colors.length);
  });
});
