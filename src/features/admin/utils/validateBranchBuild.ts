import type {
  BranchBuildValidationError,
  BranchBuildValidationResult,
  BranchColumnId,
  DivinityBranchBuildValidationDraft,
  DivinityGameMode,
  TreeTemplateMajorSkillNode,
} from "../types/admin.types";
import {
  DIVINITY_SKILL_AWAKENED_NODE_BUDGET,
  DIVINITY_SKILL_BASE_NODE_BUDGET,
  DIVINITY_SKILL_LOADOUT_MAX_SLOTS,
  getDivinitySkillLoadoutCost,
} from "@/features/game-data/divinity";
const columnIds: BranchColumnId[] = ["left", "center", "right"];

/** Минимальный уровень прогресса по каждой колонке для экспорта билда */
export const MIN_BRANCH_PROGRESS_LEVEL = 18;

// Подписи колонок в родительном падеже для сообщений об ошибках
const columnLabels: Record<BranchColumnId, string> = {
  left: "левой",
  center: "центральной",
  right: "правой",
};

type ValidationSources = {
  heroes: readonly { id: string; name: { ru: string; en: string } }[];
  branches: readonly { id: string }[];
  skills: readonly {
    id: string;
    branchId: string;
    tier: number;
    nodeCost?: 1 | 2 | 3;
  }[];
  template: readonly {
    level: number;
    columnId: string;
    nodeType: string;
    tier?: number;
  }[];
  weaponAwakeningColors: readonly { id: string }[];
  weaponAwakeningSlots: readonly { slot: number }[];
  artifacts: readonly { id: string }[];
  runes: readonly { id: string }[];
};

export function validateBranchBuild(
  draft: DivinityBranchBuildValidationDraft,
  sources: ValidationSources,
): BranchBuildValidationResult {
  const errors: BranchBuildValidationError[] = [];
  const branchIds = new Set(sources.branches.map((branch) => branch.id));
  const skillsById = new Map(sources.skills.map((skill) => [skill.id, skill]));
  const divinitySkillCostsById = new Map(
    sources.skills
      .filter(
        (skill): skill is typeof skill & { nodeCost: 1 | 2 | 3 } =>
          skill.nodeCost === 1 || skill.nodeCost === 2 || skill.nodeCost === 3,
      )
      .map((skill) => [skill.id, skill]),
  );
  const majorSlots = sources.template
    .filter((node) => node.nodeType === "majorSkill")
    .filter(isMajorSkillSlot);
  const majorSlotKeys = new Set(
    majorSlots.map((node) => getSlotKey(node.columnId, node.level)),
  );
  const majorSlotByKey = new Map(
    majorSlots.map((node) => [getSlotKey(node.columnId, node.level), node]),
  );
  const selectedMajorNodes = new Map(
    draft.majorNodes.map((node) => [getSlotKey(node.columnId, node.level), node]),
  );
  const weaponColorIds = new Set(
    sources.weaponAwakeningColors.map((color) => color.id),
  );
  const weaponSlotNumbers = new Set(
    sources.weaponAwakeningSlots.map((slot) => slot.slot),
  );
  const selectedWeaponSlots = new Map(
    draft.weaponAwakening.map((entry) => [entry.slot, entry]),
  );
  const knownArtifactIds = new Set(sources.artifacts.map((artifact) => artifact.id));
  const knownRuneIds = new Set(sources.runes.map((rune) => rune.id));
  const heroesById = new Map(sources.heroes.map((hero) => [hero.id, hero]));

  if (!draft.heroId?.trim()) {
    errors.push({
      code: "hero.required",
      message: "Выберите героя из списка.",
      path: "heroId",
    });
  } else {
    const catalogHero = heroesById.get(draft.heroId);

    if (!catalogHero) {
      errors.push({
        code: "hero.unknown",
        message: "Выбранный герой отсутствует в базе.",
        path: "heroId",
      });
    } else if (draft.heroName !== catalogHero.name.ru) {
      errors.push({
        code: "hero.nameMismatch",
        message: "Имя героя должно соответствовать выбранному герою из базы.",
        path: "heroName",
      });
    }
  }

  if (!isDivinityGameMode(draft.gameMode)) {
    errors.push({
      code: "gameMode.invalid",
      message: "Режим игры должен быть PvP или PvE.",
      path: "gameMode",
    });
  }

  if (!Array.isArray(draft.equipment.artifactIds) || draft.equipment.artifactIds.length === 0) {
    errors.push({
      code: "equipment.artifactRequired",
      message: "Выберите оружие.",
      path: "equipment.artifactIds",
    });
  } else {
    const seenArtifactIds = new Set<string>();

    draft.equipment.artifactIds.forEach((artifactId, index) => {
      if (!knownArtifactIds.has(artifactId)) {
        errors.push({
          code: "equipment.artifactUnknown",
          message: "Выбрано неизвестное оружие.",
          path: `equipment.artifactIds.${index}`,
        });
      }

      if (seenArtifactIds.has(artifactId)) {
        errors.push({
          code: "equipment.artifactDuplicate",
          message: "Оружие уже добавлено в список вариантов.",
          path: `equipment.artifactIds.${index}`,
        });
      }

      seenArtifactIds.add(artifactId);
    });
  }

  if (!Array.isArray(draft.equipment.runeIds) || draft.equipment.runeIds.length === 0) {
    errors.push({
      code: "equipment.runeRequired",
      message: "Выберите руну.",
      path: "equipment.runeIds",
    });
  } else {
    const seenRuneIds = new Set<string>();

    draft.equipment.runeIds.forEach((runeId, index) => {
      if (!knownRuneIds.has(runeId)) {
        errors.push({
          code: "equipment.runeUnknown",
          message: "Выбрана неизвестная руна.",
          path: `equipment.runeIds.${index}`,
        });
      }

      if (seenRuneIds.has(runeId)) {
        errors.push({
          code: "equipment.runeDuplicate",
          message: "Руна уже добавлена в список вариантов.",
          path: `equipment.runeIds.${index}`,
        });
      }

      seenRuneIds.add(runeId);
    });
  }

  validateDivinitySkillLoadoutRow({
    errors,
    skillsById: divinitySkillCostsById,
    skillIds: draft.divinitySkills?.base ?? [],
    label: "для 6 узлов",
    maxNodes: DIVINITY_SKILL_BASE_NODE_BUDGET,
    path: "divinitySkills.base",
  });

  validateDivinitySkillLoadoutRow({
    errors,
    skillsById: divinitySkillCostsById,
    skillIds: draft.divinitySkills?.awakened ?? [],
    label: "для 7 узлов",
    maxNodes: DIVINITY_SKILL_AWAKENED_NODE_BUDGET,
    path: "divinitySkills.awakened",
  });

  for (const columnId of columnIds) {
    const branchId = draft.columns[columnId];

    if (!branchId) {
      errors.push({
        code: "column.branchRequired",
        message: `Выберите ветку для ${columnLabels[columnId]} колонки.`,
        path: `columns.${columnId}`,
      });
      continue;
    }

    if (!branchIds.has(branchId)) {
      errors.push({
        code: "column.branchUnknown",
        message: `Для ${columnLabels[columnId]} колонки выбрана неизвестная ветка.`,
        path: `columns.${columnId}`,
      });
    }
  }

  for (const columnId of columnIds) {
    const progress = draft.progress[columnId];

    if (progress === undefined || progress < MIN_BRANCH_PROGRESS_LEVEL) {
      errors.push({
        code: "progress.minimumLevel",
        message: `Минимальный уровень ${columnLabels[columnId]} ветки — ${MIN_BRANCH_PROGRESS_LEVEL}.`,
        path: `progress.${columnId}`,
      });
    }
  }

  for (const slot of majorSlots) {
    const selectedNode = selectedMajorNodes.get(
      getSlotKey(slot.columnId, slot.level),
    );

    if (!selectedNode) {
      errors.push({
        code: "majorNode.required",
        message: `Выберите крупный навык для ${columnLabels[slot.columnId]} колонки на уровне ${slot.level}.`,
        path: getMajorNodePath(slot.columnId, slot.level),
      });
    }
  }

  for (const slot of sources.weaponAwakeningSlots) {
    const selected = selectedWeaponSlots.get(slot.slot);

    if (!selected) {
      errors.push({
        code: "weaponAwakening.slotRequired",
        message: `Выберите цвет пробуждения оружия для слота ${slot.slot}.`,
        path: `weaponAwakening.${slot.slot}`,
      });
    }
  }

  for (const entry of draft.weaponAwakening) {
    const path = `weaponAwakening.${entry.slot}`;

    if (!weaponSlotNumbers.has(entry.slot)) {
      errors.push({
        code: "weaponAwakening.slotRequired",
        message: `Неизвестный слот пробуждения оружия ${entry.slot}.`,
        path,
      });
      continue;
    }

    if (!weaponColorIds.has(entry.colorId)) {
      errors.push({
        code: "weaponAwakening.colorUnknown",
        message: `Неизвестный цвет пробуждения оружия для слота ${entry.slot}.`,
        path,
      });
    }
  }

  for (const node of draft.majorNodes) {
    const path = getMajorNodePath(node.columnId, node.level);

    if (!majorSlotKeys.has(getSlotKey(node.columnId, node.level))) {
      errors.push({
        code: "majorNode.slotUnknown",
        message: `Неизвестный слот навыка для ${columnLabels[node.columnId]} колонки на уровне ${node.level}.`,
        path,
      });
      continue;
    }

    if (draft.columns[node.columnId] !== node.branchId) {
      errors.push({
        code: "majorNode.branchMismatch",
        message: `Ветка навыка не совпадает с веткой ${columnLabels[node.columnId]} колонки.`,
        path,
      });
    }

    const skill = skillsById.get(node.skillId);

    if (!skill) {
      errors.push({
        code: "majorNode.skillUnknown",
        message: `Для ${columnLabels[node.columnId]} колонки на уровне ${node.level} выбран неизвестный навык.`,
        path,
      });
      continue;
    }

    if (skill.branchId !== draft.columns[node.columnId]) {
      errors.push({
        code: "majorNode.skillBranchMismatch",
        message: `Выбранный навык не принадлежит ветке ${columnLabels[node.columnId]} колонки.`,
        path,
      });
      continue;
    }

    const slot = majorSlotByKey.get(getSlotKey(node.columnId, node.level));

    if (slot && skill.tier !== slot.tier) {
      errors.push({
        code: "majorNode.skillTierMismatch",
        message: `Выбранный навык не подходит для слота tier ${slot.tier} на уровне ${node.level}.`,
        path,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function getSlotKey(columnId: BranchColumnId, level: number): string {
  return `${columnId}:${level}`;
}

function getMajorNodePath(columnId: BranchColumnId, level: number): string {
  return `majorNodes.${columnId}.${level}`;
}

function isMajorSkillSlot(
  node: {
    level: number;
    columnId: string;
    nodeType: string;
    tier?: number;
  },
): node is TreeTemplateMajorSkillNode {
  return (
    isBranchColumnId(node.columnId) &&
    node.nodeType === "majorSkill" &&
    isDivinitySkillTier(node.tier)
  );
}

function isBranchColumnId(columnId: string): columnId is BranchColumnId {
  return columnIds.includes(columnId as BranchColumnId);
}

function isDivinitySkillTier(tier: number | undefined): tier is 1 | 2 | 3 {
  return tier === 1 || tier === 2 || tier === 3;
}

function isDivinityGameMode(mode: string): mode is DivinityGameMode {
  return mode === "pvp" || mode === "pve";
}

function validateDivinitySkillLoadoutRow(params: {
  errors: BranchBuildValidationError[];
  skillsById: ReadonlyMap<string, { nodeCost: 1 | 2 | 3; tier: number }>;
  skillIds: readonly string[];
  label: string;
  maxNodes: number;
  path: string;
}) {
  const seenSkillIds = new Set<string>();

  if (params.skillIds.length > DIVINITY_SKILL_LOADOUT_MAX_SLOTS) {
    params.errors.push({
      code: "divinitySkills.slotLimitExceeded",
      message: "В полосе навыков божественности может быть не больше 3 навыков.",
      path: params.path,
    });
  }

  params.skillIds.forEach((skillId, index) => {
    const entryPath = `${params.path}.${index}`;

    if (!params.skillsById.has(skillId)) {
      params.errors.push({
        code: "divinitySkills.skillUnknown",
        message: "Выбран неизвестный навык божественности.",
        path: entryPath,
      });
    }

    if (seenSkillIds.has(skillId)) {
      params.errors.push({
        code: "divinitySkills.duplicate",
        message: "Навык божественности уже выбран в этой полосе.",
        path: entryPath,
      });
    }

    seenSkillIds.add(skillId);
  });

  const totalCost = getDivinitySkillLoadoutCost(
    params.skillIds,
    params.skillsById,
  );

  if (totalCost > params.maxNodes) {
    params.errors.push({
      code: "divinitySkills.nodeBudgetExceeded",
      message: `Навыки божественности ${params.label} превышают бюджет: ${totalCost}/${params.maxNodes}.`,
      path: params.path,
    });
  }
}
