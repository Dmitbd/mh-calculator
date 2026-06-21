export type WeaponAwakeningColorId = "red" | "yellow" | "green" | "blue" | "purple";

export type WeaponAwakeningColor = {
  id: WeaponAwakeningColorId;
  label: string;
  order: number;
  color: string;
  icon?: string;
};

export type WeaponAwakeningSlot = {
  slot: number;
};

export type WeaponAwakeningSlotSelection = {
  slot: number;
  colorId: WeaponAwakeningColorId;
};

/** Класс героя для бонусов Iconic Weapon */
export type IconicWeaponHeroClass =
  | "tank"
  | "physical-fighter"
  | "magical-fighter"
  | "support";

/** Порог активации бонуса по количеству нод одного цвета */
export type WeaponAwakeningBonusThreshold = 2 | 4 | 8;

/** Правило бонуса из weapon-awakening-combos.json */
export type WeaponAwakeningComboRule = {
  /** Класс героя */
  heroClass: IconicWeaponHeroClass;
  /** Цвет ноды */
  color: WeaponAwakeningColorId;
  /** Значения бонуса для порогов 2 / 4 / 8 */
  values: [number, number, number];
  /** Описание эффекта с плейсхолдером {value} */
  description: {
    en: string;
  };
};

/** Справочник комбо-бонусов пробуждения оружия */
export type WeaponAwakeningCombosData = {
  schemaVersion: 1;
  /** Глобальные пороги активации */
  thresholds: [2, 4, 8];
  /** Правила по классу и цвету */
  combos: WeaponAwakeningComboRule[];
};

/** Активный бонус, вычисленный из выбранных цветов */
export type WeaponAwakeningActiveBonus = {
  /** Цвет нод */
  color: WeaponAwakeningColorId;
  /** Сколько нод этого цвета выбрано */
  count: number;
  /** Активный порог */
  threshold: WeaponAwakeningBonusThreshold;
  /** Числовое значение бонуса для текущего порога */
  value: number;
  /** Готовое описание на английском */
  description: string;
};
