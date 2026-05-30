import type {
  BranchBuildValidationError,
  BranchBuildValidationResult,
  BranchColumnId,
  DivinityBranchBuildValidationDraft,
  DivinityGameMode,
  TreeTemplateMajorSkillNode,
} from "../types/admin.types";
const columnIds: BranchColumnId[] = ["left", "center", "right"];

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

  if (!isDivinityGameMode(draft.gameMode)) {
    errors.push({
      code: "gameMode.invalid",
      message: "Game mode must be PvP or PvE.",
      path: "gameMode",
    });
  }

  if (!draft.heroName.trim()) {
    errors.push({
      code: "heroName.required",
      message: "Hero name is required.",
    });
  }

  for (const columnId of columnIds) {
    const branchId = draft.columns[columnId];

    if (!branchId) {
      errors.push({
        code: "column.branchRequired",
        message: `Branch is required for ${columnId}.`,
        path: `columns.${columnId}`,
      });
      continue;
    }

    if (!branchIds.has(branchId)) {
      errors.push({
        code: "column.branchUnknown",
        message: `Unknown branch selected for ${columnId}.`,
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
        message: `Major skill is required for ${slot.columnId} level ${slot.level}.`,
        path: getMajorNodePath(slot.columnId, slot.level),
      });
    }
  }

  for (const slot of sources.weaponAwakeningSlots) {
    const selected = selectedWeaponSlots.get(slot.slot);

    if (!selected) {
      errors.push({
        code: "weaponAwakening.slotRequired",
        message: `Weapon awakening color is required for slot ${slot.slot}.`,
        path: `weaponAwakening.${slot.slot}`,
      });
    }
  }

  for (const entry of draft.weaponAwakening) {
    const path = `weaponAwakening.${entry.slot}`;

    if (!weaponSlotNumbers.has(entry.slot)) {
      errors.push({
        code: "weaponAwakening.slotRequired",
        message: `Unknown weapon awakening slot ${entry.slot}.`,
        path,
      });
      continue;
    }

    if (!weaponColorIds.has(entry.colorId)) {
      errors.push({
        code: "weaponAwakening.colorUnknown",
        message: `Unknown weapon awakening color for slot ${entry.slot}.`,
        path,
      });
    }
  }

  for (const node of draft.majorNodes) {
    const path = getMajorNodePath(node.columnId, node.level);

    if (!majorSlotKeys.has(getSlotKey(node.columnId, node.level))) {
      errors.push({
        code: "majorNode.slotUnknown",
        message: `Unknown major skill slot for ${node.columnId} level ${node.level}.`,
        path,
      });
      continue;
    }

    if (draft.columns[node.columnId] !== node.branchId) {
      errors.push({
        code: "majorNode.branchMismatch",
        message: `Selected node branch does not match ${node.columnId}.`,
        path,
      });
    }

    const skill = skillsById.get(node.skillId);

    if (!skill) {
      errors.push({
        code: "majorNode.skillUnknown",
        message: `Unknown skill selected for ${node.columnId} level ${node.level}.`,
        path,
      });
      continue;
    }

    if (skill.branchId !== draft.columns[node.columnId]) {
      errors.push({
        code: "majorNode.skillBranchMismatch",
        message: `Selected skill does not belong to ${draft.columns[node.columnId]}.`,
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
