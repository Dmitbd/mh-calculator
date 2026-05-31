import type {
  BranchProgressLevels,
  DivinityBranchBuildExport,
  DraftBranchColumns,
  WeaponAwakeningColorId,
} from "@/features/admin/types/admin.types";

/** Пропсы сетки и экипировки, восстановленные из экспортированного билда */
export type BranchBuildViewModel = {
  /** Выбранные ветки по колонкам */
  selectedBranches: DraftBranchColumns;
  /** Выбранные мажорные скиллы по ключу "columnId:level" */
  selectedMajorSkills: Record<string, string>;
  /** Уровень прогресса по колонкам — для подсветки активных нод */
  progressLevels: BranchProgressLevels;
  /** Цвета пробуждения оружия по номеру слота */
  weaponAwakeningSelections: Partial<Record<number, WeaponAwakeningColorId>>;
  /** Id выбранного артефакта или null */
  artifactId: string | null;
  /** Id выбранной руны или null */
  runeId: string | null;
};

/** Ключ мажорной ноды — совпадает с форматом BranchBuilderGrid */
function getMajorSkillKey(columnId: string, level: number): string {
  return `${columnId}:${level}`;
}

/**
 * Преобразует экспорт билда (DivinityBranchBuildExport) в пропсы,
 * которые принимают компоненты branch-builder в режиме readOnly.
 */
export function mapBuildToView(
  build: DivinityBranchBuildExport,
): BranchBuildViewModel {
  const selectedMajorSkills: Record<string, string> = {};
  for (const node of build.majorNodes) {
    selectedMajorSkills[getMajorSkillKey(node.columnId, node.level)] =
      node.skillId;
  }

  const weaponAwakeningSelections: Partial<
    Record<number, WeaponAwakeningColorId>
  > = {};
  for (const slot of build.weaponAwakening) {
    weaponAwakeningSelections[slot.slot] = slot.colorId;
  }

  return {
    selectedBranches: build.columns,
    selectedMajorSkills,
    progressLevels: build.progress,
    weaponAwakeningSelections,
    artifactId: build.equipment.artifactId,
    runeId: build.equipment.runeId,
  };
}
