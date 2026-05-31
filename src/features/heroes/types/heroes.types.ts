import type {
  DivinityBranchBuildExport,
  DivinityGameMode,
} from "@/features/admin/types/admin.types";

/** Герой из каталога heroes.json — для экрана выбора */
export type Hero = {
  /** Уникальный id героя (slug, совпадает с именем файла билда) */
  id: string;
  /** Имя героя для UI */
  name: string;
  /** Путь к иконке героя */
  icon: string;
};

/**
 * Набор билдов одного героя по режимам.
 * Значение null — билд для режима ещё не готов.
 */
export type HeroBuildSet = Record<
  DivinityGameMode,
  DivinityBranchBuildExport | null
>;
