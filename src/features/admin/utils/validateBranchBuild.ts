import type {
  BranchBuildValidationError,
  BranchBuildValidationResult,
  BranchColumnId,
  DivinityBranchBuildValidationDraft,
  DivinityGameMode,
  TreeTemplateMajorSkillNode,
} from "../types/admin.types";
const columnIds: BranchColumnId[] = ["left", "center", "right"];

// Подписи колонок в родительном падеже для сообщений об ошибках
const columnLabels: Record<BranchColumnId, string> = {
  left: "левой",
  center: "центральной",
  right: "правой",
};

type ValidationSources = {
  branches: readonly { id: string }[];
  skills: readonly { id: string; branchId: string }[];
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
  const majorSlots = sources.template
    .filter((node) => node.nodeType === "majorSkill")
    .filter(isMajorSkillSlot);
  const majorSlotKeys = new Set(
    majorSlots.map((node) => getSlotKey(node.columnId, node.level)),
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
  const artifactIds = new Set(sources.artifacts.map((artifact) => artifact.id));
  const runeIds = new Set(sources.runes.map((rune) => rune.id));

  if (!isDivinityGameMode(draft.gameMode)) {
    errors.push({
      code: "gameMode.invalid",
      message: "Режим игры должен быть PvP или PvE.",
      path: "gameMode",
    });
  }

  if (!draft.heroName.trim()) {
    errors.push({
      code: "heroName.required",
      message: "Укажите имя героя.",
    });
  }

  if (!draft.equipment.artifactId) {
    errors.push({
      code: "equipment.artifactRequired",
      message: "Выберите оружие.",
      path: "equipment.artifactId",
    });
  } else if (!artifactIds.has(draft.equipment.artifactId)) {
    errors.push({
      code: "equipment.artifactUnknown",
      message: "Выбрано неизвестное оружие.",
      path: "equipment.artifactId",
    });
  }

  if (!draft.equipment.runeId) {
    errors.push({
      code: "equipment.runeRequired",
      message: "Выберите руну.",
      path: "equipment.runeId",
    });
  } else if (!runeIds.has(draft.equipment.runeId)) {
    errors.push({
      code: "equipment.runeUnknown",
      message: "Выбрана неизвестная руна.",
      path: "equipment.runeId",
    });
  }

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
