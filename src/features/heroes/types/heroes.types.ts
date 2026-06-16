import type {
  DivinityBranchBuildExport,
  DivinityGameMode,
} from "@/features/admin/types/admin.types";

/** Локализованное имя */
export type LocalizedName = {
  /** Английское имя */
  en: string;
  /** Русское имя для UI */
  ru: string;
};

/** Редкость героя */
export type HeroRarity = "ur" | "ssr";

/** Роль героя */
export type HeroRole = "fighter" | "tank" | "mage" | "support";

/** Стихия героя */
export type HeroElement = "fire" | "water" | "earth" | "wind" | "metal";

/** Фракция героя */
export type HeroFaction = "luminarch" | "shadowarch" | "guardian" | "verdian";

/** Тип урона героя */
export type HeroDamageType = "physical" | "magical" | null;

/** Герой из каталога heroes.json */
export type Hero = {
  /** Уникальный id героя (slug, совпадает с именем файла билда) */
  id: string;
  /** Локализованное имя */
  name: LocalizedName;
  /** Путь к иконке героя */
  icon: string;
  /** Редкость */
  rarity: HeroRarity;
  /** Роль */
  role: HeroRole;
  /** Тип урона */
  damageType: HeroDamageType;
  /** Стихия */
  element: HeroElement;
  /** Фракции */
  factions: HeroFaction[];
  /** Дата выхода в ISO или null */
  releaseDate: string | null;
};

/** Запись словаря (роль, фракция, стихия, редкость) */
export type HeroDictionaryEntry = {
  /** Id записи */
  id: string;
  /** Локализованное имя */
  name: LocalizedName;
  /** Путь к иконке */
  icon: string;
  /** Порядок сортировки */
  order: number;
};

/**
 * Набор билдов одного героя по режимам.
 * Значение null — билд для режима ещё не готов.
 */
export type HeroBuildSet = Record<
  DivinityGameMode,
  DivinityBranchBuildExport | null
>;
