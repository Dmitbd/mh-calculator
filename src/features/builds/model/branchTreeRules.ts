import type {
  BranchColumnId,
  DivinityBranch,
  DivinityBranchId,
  DraftBranchColumns,
  TreeTemplateNode,
} from "@/features/game-data/divinity/types";

type SelectedMajorSkills = Partial<Record<string, string>>;

export function getMissingPreviousMajorSkillLevel(
  template: readonly TreeTemplateNode[],
  selectedMajorSkills: SelectedMajorSkills,
  columnId: BranchColumnId,
  level: number,
): number | null {
  return (
    template
      .filter(
        (node) =>
          node.columnId === columnId &&
          node.nodeType === "majorSkill" &&
          node.level < level,
      )
      .map((node) => node.level)
      .sort((firstLevel, secondLevel) => firstLevel - secondLevel)
      .find(
        (previousLevel) =>
          !selectedMajorSkills[`${columnId}:${previousLevel}`],
      ) ?? null
  );
}

export function isBranchSelectionAllowed(
  selectedBranches: DraftBranchColumns,
  columnId: BranchColumnId,
  branchId: DivinityBranchId,
): boolean {
  return !Object.entries(selectedBranches).some(
    ([selectedColumnId, selectedBranchId]) =>
      selectedColumnId !== columnId && selectedBranchId === branchId,
  );
}

export function getAvailableBranchesForColumn(
  branches: readonly DivinityBranch[],
  selectedBranches: DraftBranchColumns,
  columnId: BranchColumnId,
): DivinityBranch[] {
  return branches.filter((branch) =>
    isBranchSelectionAllowed(selectedBranches, columnId, branch.id),
  );
}
