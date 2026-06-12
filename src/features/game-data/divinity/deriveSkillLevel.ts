import type { DivinitySkillUpgradeLevel } from "./types";

/** Уровни дерева с нодой «Divinity skill level» — каждая даёт +1 к уровню скилла */
export const SKILL_UPGRADE_TREE_LEVELS = [20, 24, 28] as const;

/**
 * Вычисляет уровень прокачки мажорного скилла колонки
 * по прогрессу ветки (ноды 20, 24, 28 дают +1 каждая, база — 1).
 */
export function deriveSkillLevel(
  columnProgress: number | undefined,
): DivinitySkillUpgradeLevel {
  if (columnProgress === undefined) {
    return 1;
  }

  const upgrades = SKILL_UPGRADE_TREE_LEVELS.filter(
    (level) => columnProgress >= level,
  ).length;

  return Math.min(4, 1 + upgrades) as DivinitySkillUpgradeLevel;
}
