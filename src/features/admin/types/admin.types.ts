export type DivinityBranchId =
  | "asterial"
  | "psyche"
  | "immortality"
  | "devoid"
  | "primeval";

export type BranchColumnId = "left" | "center" | "right";

export type DivinitySkillTier = 1 | 2 | 3;

export type DivinityBranch = {
  id: DivinityBranchId;
  title: string;
  icon: string;
  order: number;
};

export type BranchColumn = {
  id: BranchColumnId;
  label: string;
  isMain: boolean;
};

export type SelectedBranchColumns = Record<BranchColumnId, DivinityBranchId>;

export type DivinityMajorSkill = {
  id: string;
  branchId: DivinityBranchId;
  tier?: DivinitySkillTier;
  name: string;
  icon: string;
  description?: string;
};

export type TreeTemplateMajorSkillNode = {
  level: number;
  columnId: BranchColumnId;
  nodeType: "majorSkill";
  tier: DivinitySkillTier;
};

export type TreeTemplateMinorStatNode = {
  level: number;
  columnId: BranchColumnId;
  nodeType: "minorStat";
  statId: string;
  label: string;
  value: number;
  unit: "%" | "flat" | "level";
  icon: string;
};

export type TreeTemplateNode =
  | TreeTemplateMajorSkillNode
  | TreeTemplateMinorStatNode;

export type DivinityBranchBuildMajorNode = {
  level: number;
  columnId: BranchColumnId;
  branchId: DivinityBranchId;
  skillId: string;
};

export type DivinityBranchBuildDraft = {
  heroName: string;
  columns: SelectedBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
};

export type DivinityBranchBuildExport = DivinityBranchBuildDraft & {
  schemaVersion: 1;
  metadata: {
    createdAt: string;
    source: "manual-branch-builder";
  };
};

export type BranchBuildValidationError = {
  code:
    | "heroName.required"
    | "column.branchRequired"
    | "column.branchUnknown"
    | "majorNode.required"
    | "majorNode.slotUnknown"
    | "majorNode.branchMismatch"
    | "majorNode.skillUnknown"
    | "majorNode.skillBranchMismatch";
  message: string;
  path?: string;
};

export type BranchBuildValidationResult = {
  isValid: boolean;
  errors: BranchBuildValidationError[];
};
