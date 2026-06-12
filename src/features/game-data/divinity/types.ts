export type DivinityBranchId =
  | "asterial"
  | "psyche"
  | "immortality"
  | "devoid"
  | "primeval";

/** Tier мажорного скилла — соответствует слоту в tree-template */
export type DivinitySkillTier = 1 | 2 | 3;

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
