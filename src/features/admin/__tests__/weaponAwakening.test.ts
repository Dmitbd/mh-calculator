import colors from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import slots from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";

import {
  buildWeaponAwakeningSlots,
  getNextWeaponAwakeningColor,
  hasFilledAllWeaponAwakeningSlots,
} from "../utils/weaponAwakening";
import type { WeaponAwakeningColor } from "../types/admin.types";

const catalogColors = colors as WeaponAwakeningColor[];

describe("weaponAwakening utils", () => {
  it("cycles colors in catalog order", () => {
    expect(getNextWeaponAwakeningColor(null, catalogColors)).toBe("red");
    expect(getNextWeaponAwakeningColor("red", catalogColors)).toBe("yellow");
    expect(getNextWeaponAwakeningColor("purple", catalogColors)).toBe("red");
  });

  it("builds slot selections for export", () => {
    const result = buildWeaponAwakeningSlots(slots, {
      1: "red",
      2: "yellow",
      8: "purple",
    });

    expect(result).toEqual([
      { slot: 1, colorId: "red" },
      { slot: 2, colorId: "yellow" },
      { slot: 8, colorId: "purple" },
    ]);
  });

  it("checks that all slots are filled", () => {
    const filled = Object.fromEntries(slots.map((slot) => [slot.slot, "red"]));

    expect(hasFilledAllWeaponAwakeningSlots(slots, filled)).toBe(true);
    expect(hasFilledAllWeaponAwakeningSlots(slots, { 1: "red" })).toBe(false);
  });
});
