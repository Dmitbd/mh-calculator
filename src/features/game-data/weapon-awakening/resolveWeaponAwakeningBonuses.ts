import type {
  WeaponAwakeningColorId,
  WeaponAwakeningSlotSelection,
} from "@/features/admin/types/admin.types";
import type { Hero } from "@/features/heroes/types/heroes.types";

import type {
  WeaponAwakeningActiveBonus,
  WeaponAwakeningCombosData,
} from "./types";
import {
  getIconicWeaponHeroClass,
  getWeaponAwakeningActiveBonuses,
} from "./weaponAwakeningBonuses";

/** Преобразует map слотов в массив выборов для расчёта бонусов */
export function toWeaponAwakeningSelections(
  selections: Partial<Record<number, WeaponAwakeningColorId>>,
): WeaponAwakeningSlotSelection[] {
  return Object.entries(selections)
    .map(([slot, colorId]) => {
      if (!colorId) {
        return null;
      }

      return {
        slot: Number(slot),
        colorId,
      };
    })
    .filter((entry): entry is WeaponAwakeningSlotSelection => entry !== null);
}

function isWeaponAwakeningSelectionMap(
  selections:
    | readonly WeaponAwakeningSlotSelection[]
    | Partial<Record<number, WeaponAwakeningColorId>>,
): selections is Partial<Record<number, WeaponAwakeningColorId>> {
  return !Array.isArray(selections);
}

/** Вычисляет активные бонусы для героя и выбранных цветов */
export function resolveWeaponAwakeningBonuses(params: {
  hero: Hero | null | undefined;
  selections:
    | readonly WeaponAwakeningSlotSelection[]
    | Partial<Record<number, WeaponAwakeningColorId>>;
  combosData: WeaponAwakeningCombosData;
}): WeaponAwakeningActiveBonus[] {
  const { hero, selections, combosData } = params;

  if (!hero) {
    return [];
  }

  const normalizedSelections = isWeaponAwakeningSelectionMap(selections)
    ? toWeaponAwakeningSelections(selections)
    : [...selections];

  return getWeaponAwakeningActiveBonuses({
    heroClass: getIconicWeaponHeroClass(hero),
    selections: normalizedSelections,
    rules: combosData.combos,
    thresholds: combosData.thresholds,
  });
}
