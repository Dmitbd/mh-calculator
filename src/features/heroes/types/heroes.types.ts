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
