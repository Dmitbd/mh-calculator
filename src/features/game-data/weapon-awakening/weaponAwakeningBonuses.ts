import type { Hero } from "@/features/heroes/types/heroes.types";

import type {
  IconicWeaponHeroClass,
  WeaponAwakeningActiveBonus,
  WeaponAwakeningBonusThreshold,
  WeaponAwakeningColorId,
  WeaponAwakeningComboRule,
  WeaponAwakeningSlotSelection,
} from "./types";

const colorOrder: WeaponAwakeningColorId[] = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
];

/** Маппинг роли и типа урона героя в класс Iconic Weapon */
export function getIconicWeaponHeroClass(hero: Hero): IconicWeaponHeroClass | null {
  if (hero.role === "tank") {
    return "tank";
  }

  if (hero.role === "support") {
    return "support";
  }

  if (hero.role === "fighter" && hero.damageType === "physical") {
    return "physical-fighter";
  }

  if (hero.role === "mage" && hero.damageType === "magical") {
    return "magical-fighter";
  }

  return null;
}

/** Подсчёт выбранных цветов по слотам */
export function countWeaponAwakeningColors(
  selections: readonly WeaponAwakeningSlotSelection[],
): Partial<Record<WeaponAwakeningColorId, number>> {
  const counts: Partial<Record<WeaponAwakeningColorId, number>> = {};

  for (const selection of selections) {
    counts[selection.colorId] = (counts[selection.colorId] ?? 0) + 1;
  }

  return counts;
}

function getActiveThreshold(count: number): WeaponAwakeningBonusThreshold | null {
  if (count < 2) {
    return null;
  }

  if (count <= 3) {
    return 2;
  }

  if (count <= 7) {
    return 4;
  }

  return 8;
}

function getThresholdIndex(
  threshold: WeaponAwakeningBonusThreshold,
  thresholds: readonly [2, 4, 8],
): number {
  const index = thresholds.indexOf(threshold);

  if (index === -1) {
    throw new Error(`Unknown weapon awakening threshold: ${threshold}`);
  }

  return index;
}

function formatBonusValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function interpolateDescription(template: string, value: number): string {
  return template.replace("{value}", formatBonusValue(value));
}

/** Активные бонусы по классу героя и выбранным цветам */
export function getWeaponAwakeningActiveBonuses(params: {
  heroClass: IconicWeaponHeroClass | null;
  selections: readonly WeaponAwakeningSlotSelection[];
  rules: readonly WeaponAwakeningComboRule[];
  thresholds: readonly [2, 4, 8];
}): WeaponAwakeningActiveBonus[] {
  const { heroClass, selections, rules, thresholds } = params;

  if (!heroClass) {
    return [];
  }

  const counts = countWeaponAwakeningColors(selections);
  const classRules = rules.filter((rule) => rule.heroClass === heroClass);
  const bonuses: WeaponAwakeningActiveBonus[] = [];

  for (const rule of classRules) {
    const count = counts[rule.color] ?? 0;
    const threshold = getActiveThreshold(count);

    if (!threshold) {
      continue;
    }

    const value = rule.values[getThresholdIndex(threshold, thresholds)];

    bonuses.push({
      color: rule.color,
      count,
      threshold,
      value,
      description: interpolateDescription(rule.description.en, value),
    });
  }

  return bonuses.sort(
    (first, second) =>
      colorOrder.indexOf(first.color) - colorOrder.indexOf(second.color),
  );
}
