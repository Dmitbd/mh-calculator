import type {
  BranchBuildValidationError,
  BranchBuildValidationResult,
  BranchColumnId,
  DivinityBranchBuildValidationDraft,
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
