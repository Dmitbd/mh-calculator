import colorsData from "./weapon-awakening-colors.json";
import combosData from "./weapon-awakening-combos.json";
import slotsData from "./weapon-awakening-slots.json";
import type {
  WeaponAwakeningColor,
  WeaponAwakeningCombosData,
  WeaponAwakeningSlot,
} from "./types";

export const weaponAwakeningColors = colorsData as WeaponAwakeningColor[];
export const weaponAwakeningCombos = combosData as WeaponAwakeningCombosData;
export const weaponAwakeningSlots = slotsData as WeaponAwakeningSlot[];
