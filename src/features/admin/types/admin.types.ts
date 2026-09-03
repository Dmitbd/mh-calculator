import type { BranchBuildValidationErrorCode } from "./validation.types";

export type {
  ActiveBranchNode,
  BranchColumn,
  BranchColumnId,
  BranchProgressLevels,
  DivinityBranch,
  DivinityBranchBuildMajorNode,
  DivinityBranchId,
  DivinityMajorSkill,
  DivinitySkillTier,
  DraftBranchColumns,
  SelectedBranchColumns,
  TreeTemplateMajorSkillNode,
  TreeTemplateMinorStatNode,
  TreeTemplateNode,
} from "@/features/game-data/divinity/types";

export type {
  Artifact,
  EquipmentVariantSelection,
  Rune,
} from "@/features/game-data/equipment/types";

export type {
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
  WeaponAwakeningSlotSelection,
} from "@/features/game-data/weapon-awakening/types";

export type {
  DivinityBranchBuildDraft,
  DivinityBranchBuilderExport,
  DivinityBranchBuildExport,
  DivinityBranchBuildValidationDraft,
  DivinityGameMode,
  DivinitySkillLoadout,
  DivinitySkillLoadoutDraft,
  DivinitySkillLoadoutRowId,
  HeroBuildTargetTabPath,
} from "@/features/builds";

export type BranchBuildValidationError = {
  code: BranchBuildValidationErrorCode;
  message: string;
  path?: string;
};

export type BranchBuildValidationResult = {
  isValid: boolean;
  errors: BranchBuildValidationError[];
};
