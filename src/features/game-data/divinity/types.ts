export type DivinityBranchId =
  | "asterial"
  | "psyche"
  | "immortality"
  | "devoid"
  | "primeval";

export type BranchColumnId = "left" | "center" | "right";

/** Tier мажорного скилла — соответствует слоту в tree-template */
export type DivinitySkillTier = 1 | 2 | 3;

/** Стоимость большого навыка в узлах божественной энергии */
export type DivinitySkillNodeCost = 1 | 2 | 3;

/** Уровень прокачки скилла в игре (1–4) */
export type DivinitySkillUpgradeLevel = 1 | 2 | 3 | 4;

/** Описание эффекта на конкретном уровне прокачки */
export type DivinitySkillLevelEntry = {
  /** Уровень прокачки */
  level: DivinitySkillUpgradeLevel;
  /** Текст описания */
  description: string;
};

/** Мажорный скилл божественности из каталога */
export type DivinityMajorSkill = {
  /** Уникальный id */
  id: string;
  /** Ветка, к которой относится скилл */
  branchId: DivinityBranchId;
  /** Tier слота дерева (1, 2 или 3) */
  tier: DivinitySkillTier;
  /** Стоимость установки навыка в узлах божественной энергии */
  nodeCost: DivinitySkillNodeCost;
  /** Название для UI */
  name: string;
  /** Путь к иконке */
  icon: string;
  /** Описания по уровням прокачки */
  levels: DivinitySkillLevelEntry[];
  /** Источник данных (опционально) */
  source?: {
    type: string;
    url?: string;
    status?: string;
  };
};

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

export type DivinityBranchPointConnector = {
  readonly label: string;
  readonly description: string;
  readonly meta: string;
  readonly icon: string;
  readonly source: {
    readonly clientVersion: "1.48.0";
    readonly build: 94;
    readonly asset: "Talent12";
    readonly localizationKey: "GodTalentAttri_description_GOD_Power";
  };
};

export type DraftBranchColumns = Record<BranchColumnId, DivinityBranchId | null>;

export type SelectedBranchColumns = Record<BranchColumnId, DivinityBranchId>;

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

export type BranchProgressLevels = Partial<Record<BranchColumnId, number>>;

export type ActiveBranchNode = {
  columnId: BranchColumnId;
  level: number;
};

export type DivinityGemLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DivinityGemResourceId =
  | 700361
  | 700362
  | 700363
  | 700364
  | 700365
  | 700366
  | 700367;

export type DivinityGemChestId = "600001" | "600076";

export type DivinityGemChestContent = {
  resourceId: DivinityGemResourceId;
  gemLevel: DivinityGemLevel;
  amount: number;
};

export type DivinityGemChest = {
  id: DivinityGemChestId;
  name: string;
  icon: string;
  contents: DivinityGemChestContent[];
};
export type StoneCosts = {
  stone1: number;
  stone2: number;
  stone3: number;
  stone4: number;
  stone5: number;
  stone6: number;
  stone7: number;
};

export type DivinityLevel = {
  level: number;
  segmentCount: number;
  segmentCost: StoneCosts;
  transitionCost: StoneCosts;
  note?: string;
};
