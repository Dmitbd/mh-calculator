import type {
  Hero,
  HeroElement,
  HeroFaction,
  HeroRole,
} from "@/features/heroes/types/heroes.types";

/** Параметры фильтрации списка героев */
export type HeroListFilters = {
  /** Поисковый запрос */
  search: string;
  /** Id роли или null — все роли */
  roleId: HeroRole | null;
  /** Id фракции или null — все фракции */
  factionId: HeroFaction | null;
  /** Id стихии или null — все стихии */
  elementId: HeroElement | null;
};

/** Пустое состояние фильтров */
export const EMPTY_HERO_LIST_FILTERS: HeroListFilters = {
  search: "",
  roleId: null,
  factionId: null,
  elementId: null,
};

/** Проверяет совпадение героя с поисковым запросом */
export function matchesHeroSearch(hero: Hero, search: string): boolean {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    hero.name.ru.toLowerCase().includes(normalized) ||
    hero.name.en.toLowerCase().includes(normalized)
  );
}

/** Фильтрует героев по всем активным фильтрам (логика AND) */
export function filterHeroes(heroes: Hero[], filters: HeroListFilters): Hero[] {
  return heroes.filter((hero) => {
    if (!matchesHeroSearch(hero, filters.search)) {
      return false;
    }

    if (filters.roleId && hero.role !== filters.roleId) {
      return false;
    }

    if (filters.factionId && !hero.factions.includes(filters.factionId)) {
      return false;
    }

    if (filters.elementId && hero.element !== filters.elementId) {
      return false;
    }

    return true;
  });
}
