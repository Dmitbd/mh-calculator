import type {
  DivinityBranchId,
  DivinityMajorSkill,
  DivinitySkillTier,
} from "@/features/game-data/divinity/types";

export type {
  DivinityBranchId,
  DivinityMajorSkill,
  DivinitySkillTier,
} from "@/features/game-data/divinity/types";

/** Режим игры для сборки ветки */
export type DivinityGameMode = "pvp" | "pve";

export type BranchColumnId = "left" | "center" | "right";

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
  /** HEX fallback для отрисовки кружка */
  color: string;
  /** Локальная иконка сферы */
  icon?: string;
};

/** Слот кружка из weapon-awakening-slots.json */
export type WeaponAwakeningSlot = {
  /** Позиция кружка (1–8) */
  slot: number;
};

/** Артефакт (оружие/экипировка) из equipment/artifacts.json */
export type Artifact = {
  /** Уникальный id артефакта */
  id: string;
  /** Название для UI */
  name: string;
  /** Путь к иконке */
  icon: string;
  /** Описание эффекта по уровням */
  description: string;
};

/** Руна из equipment/runes.json */
export type Rune = {
  /** Уникальный id руны */
  id: string;
  /** Название для UI */
  name: string;
  /** Путь к иконке */
  icon: string;
  /** Описание эффекта по уровням */
  description: string;
  /** Эффект резонанса при 3 одинаковых рунах */
  elementalResonance: string;
};

/** Варианты экипировки героя — для сохранения в JSON формы */
export type EquipmentVariantSelection = {
  /** Список подходящих артефактов (порядок важен) */
  artifactIds: string[];
  /** Список подходящих рун (порядок важен) */
  runeIds: string[];
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
  /** Канонический id героя из каталога heroes.json */
  heroId: string;
  /** Русское имя из каталога после выбора героя */
  heroName: string;
  columns: SelectedBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
  /** Варианты артефактов и рун */
  equipment: EquipmentVariantSelection;
};

export type DivinityBranchBuildValidationDraft = {
  gameMode: DivinityGameMode;
  /** Id выбранного героя или null, если герой не выбран из каталога */
  heroId: string | null;
  /** Текст в поле поиска или имя выбранного героя */
  heroName: string;
  columns: DraftBranchColumns;
  majorNodes: DivinityBranchBuildMajorNode[];
  weaponAwakening: WeaponAwakeningSlotSelection[];
  /** Варианты артефактов и рун */
  equipment: EquipmentVariantSelection;
  /** Уровень прогресса по каждому столбцу */
  progress: BranchProgressLevels;
};

/** Путь целевой вкладки при экспорте из билдера */
export type HeroBuildTargetTabPath = string[];

/** Чистый билд, хранящийся в committed hero build tree */
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

/** JSON, который скачивает админский билдер, с metadata о месте вставки */
export type DivinityBranchBuilderExport = DivinityBranchBuildExport & {
  targetTabPath: HeroBuildTargetTabPath;
};

export type BranchBuildValidationError = {
  code:
    | "gameMode.invalid"
    | "hero.required"
    | "hero.unknown"
    | "hero.nameMismatch"
    | "column.branchRequired"
    | "column.branchUnknown"
    | "progress.minimumLevel"
    | "majorNode.required"
    | "majorNode.slotUnknown"
    | "majorNode.branchMismatch"
    | "majorNode.skillUnknown"
    | "majorNode.skillBranchMismatch"
    | "majorNode.skillTierMismatch"
    | "weaponAwakening.slotRequired"
    | "weaponAwakening.colorUnknown"
    | "equipment.artifactRequired"
    | "equipment.artifactUnknown"
    | "equipment.artifactDuplicate"
    | "equipment.runeRequired"
    | "equipment.runeUnknown"
    | "equipment.runeDuplicate";
  message: string;
  path?: string;
};

export type BranchBuildValidationResult = {
  isValid: boolean;
  errors: BranchBuildValidationError[];
};
