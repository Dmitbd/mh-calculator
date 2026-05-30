export type DivinityBranchId =
  | "asterial"
  | "psyche"
  | "immortality"
  | "devoid"
  | "primeval";

/** Режим игры для сборки ветки */
export type DivinityGameMode = "pvp" | "pve";

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

export type DraftBranchColumns = Record<BranchColumnId, DivinityBranchId | null>;

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

/** Id цвета пробуждения оружия */
export type WeaponAwakeningColorId = "red" | "yellow" | "green" | "blue" | "purple";

/** Цвет из справочника weapon-awakening-colors.json */
export type WeaponAwakeningColor = {
  id: WeaponAwakeningColorId;
  /** Подпись для UI */
  label: string;
  /** Порядок переключения по клику */
  order: number;
  /** HEX для отрисовки кружка */
  color: string;
};

/** Слот кружка из weapon-awakening-slots.json */
export type WeaponAwakeningSlot = {
  /** Позиция кружка (1–8) */
  slot: number;
};

/** Выбранный цвет в слоте — для export */
export type WeaponAwakeningSlotSelection = {
  /** Позиция кружка (1–8) */
  slot: number;
  /** Id цвета из справочника */
  colorId: WeaponAwakeningColorId;
};

/** Уровень прогресса (активности) по каждому столбцу: до какой ноды включительно открыто */
export type BranchProgressLevels = Partial<Record<BranchColumnId, number>>;

/** Активная (открытая) нода — для сохранения в JSON */
export type ActiveBranchNode = {
  /** Колонка (ветка), в которой находится нода */
  columnId: BranchColumnId;
  /** Уровень ноды */
  level: number;
};

export type DivinityBranchBuildDraft = {
  gameMode: DivinityGameMode;
  heroName: string;
  columns: SelectedBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
};

export type DivinityBranchBuildValidationDraft = {
  gameMode: DivinityGameMode;
  heroName: string;
  columns: DraftBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
};

export type DivinityBranchBuildExport = DivinityBranchBuildDraft & {
  schemaVersion: 1;
  /** Уровень прогресса по каждому столбцу */
  progress: BranchProgressLevels;
  /** Полный список активных (открытых) нод */
  activeNodes: ActiveBranchNode[];
  metadata: {
    createdAt: string;
    source: "manual-branch-builder";
  };
};

export type BranchBuildValidationError = {
  code:
    | "gameMode.invalid"
    | "heroName.required"
    | "column.branchRequired"
    | "column.branchUnknown"
    | "majorNode.required"
    | "majorNode.slotUnknown"
    | "majorNode.branchMismatch"
    | "majorNode.skillUnknown"
    | "majorNode.skillBranchMismatch"
    | "weaponAwakening.slotRequired"
    | "weaponAwakening.colorUnknown";
  message: string;
  path?: string;
};

export type BranchBuildValidationResult = {
  isValid: boolean;
  errors: BranchBuildValidationError[];
};
