import type {
  ActiveBranchNode,
  BranchProgressLevels,
  DivinityBranchBuildMajorNode,
  DraftBranchColumns,
  SelectedBranchColumns,
} from "@/features/game-data/divinity/types";
import type { EquipmentVariantSelection } from "@/features/game-data/equipment/types";
import type { WeaponAwakeningSlotSelection } from "@/features/game-data/weapon-awakening/types";

export type DivinityGameMode = "pvp" | "pve";

export type DivinityBranchBuildDraft = {
  gameMode: DivinityGameMode;
  heroId: string;
  heroName: string;
  columns: SelectedBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
  equipment: EquipmentVariantSelection;
};

export type DivinityBranchBuildValidationDraft = {
  gameMode: DivinityGameMode;
  heroId: string | null;
  heroName: string;
  columns: DraftBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
  equipment: EquipmentVariantSelection;
  progress: BranchProgressLevels;
};

export type HeroBuildTargetTabPath = string[];

export type DivinityBranchBuildExport = DivinityBranchBuildDraft & {
  schemaVersion: 1;
  progress: BranchProgressLevels;
  activeNodes: ActiveBranchNode[];
  metadata: {
    createdAt: string;
    source: "manual-branch-builder";
  };
};

export type DivinityBranchBuilderExport = DivinityBranchBuildExport & {
  targetTabPath: HeroBuildTargetTabPath;
};
