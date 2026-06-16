import type { Hero } from "@/features/heroes/types/heroes.types";

/** Проверяет совпадение героя с поисковым запросом (ru, en, id) */
export function matchesHeroCatalogSearch(hero: Hero, search: string): boolean {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    hero.name.ru.toLowerCase().includes(normalized) ||
    hero.name.en.toLowerCase().includes(normalized) ||
    hero.id.toLowerCase().includes(normalized)
  );
}

/** Фильтрует каталог героев по поисковому запросу */
export function searchHeroCatalog(heroes: readonly Hero[], search: string): Hero[] {
  const normalized = search.trim();

  if (!normalized) {
    return [];
  }

  return heroes.filter((hero) => matchesHeroCatalogSearch(hero, normalized));
}
