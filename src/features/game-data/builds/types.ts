import type {
  ActiveBranchNode,
  BranchProgressLevels,
  DivinityBranchBuildMajorNode,
  DivinitySkillNodeCost,
  DraftBranchColumns,
  SelectedBranchColumns,
} from "@/features/game-data/divinity/types";
import type { EquipmentVariantSelection } from "@/features/game-data/equipment/types";
import type { WeaponAwakeningSlotSelection } from "@/features/game-data/weapon-awakening/types";

export type DivinityGameMode = "pvp" | "pve";

export type DivinitySkillLoadoutRowId = "base" | "awakened";

export type DivinitySkillLoadout = {
  /** Навыки для 6 базовых узлов божественной энергии */
  base: string[];
  /** Навыки для 7 узлов при полностью пробуждённом антикварианте */
  awakened?: string[];
};

export type DivinitySkillLoadoutDraft = {
  base: Array<string | null>;
  awakened: Array<string | null>;
  awakenedEnabled: boolean;
};

export type DivinitySkillLoadoutBudget = {
  rowId: DivinitySkillLoadoutRowId;
  maxNodes: number;
  maxSlots: number;
};

export type DivinitySkillCostMap = Record<string, DivinitySkillNodeCost>;

export type DivinityBranchBuildDraft = {
  gameMode: DivinityGameMode;
  heroId: string;
  heroName: string;
  columns: SelectedBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  divinitySkills?: DivinitySkillLoadout;
  weaponAwakening: WeaponAwakeningSlotSelection[];
  equipment: EquipmentVariantSelection;
};

export type DivinityBranchBuildValidationDraft = {
  gameMode: DivinityGameMode;
  heroId: string | null;
  heroName: string;
  columns: DraftBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  divinitySkills?: DivinitySkillLoadout;
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

/** Тип вкладки билда: лист с билдом или группа дочерних вкладок */
export type HeroBuildTabKind = "build" | "group";

/** Путь к вкладке билда — цепочка id от корня */
export type HeroBuildTabPath = string[];

/** Вкладка дерева билдов героя */
export type HeroBuildTab = {
  /** Стабильный slug на уровне родителя */
  id: string;
  /** Подпись для UI */
  label: string;
  /** Порядок сортировки среди соседей */
  order: number;
  /** Лист с билдом или группа */
  kind: HeroBuildTabKind;
  /** Режим игры вкладки; дочерние наследуют от родителя */
  gameMode?: DivinityGameMode;
  /** Готовый билд или null */
  build: DivinityBranchBuildExport | null;
  /** Дочерние вкладки только для kind: "group" */
  children?: HeroBuildTab[];
};

/** Набор билдов героя — дерево вкладок schema v2 */
export type HeroBuildSet = {
  /** Версия схемы набора билдов */
  schemaVersion: 2;
  /** Корневые вкладки */
  tabs: HeroBuildTab[];
};
