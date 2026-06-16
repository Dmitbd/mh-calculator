import type { Hero, HeroBuildSet } from "@/features/heroes/types/heroes.types";

import heroesData from "./heroes.json";
import bastetBuild from "./builds/bastet.json";

/** Каталог героев для экрана выбора */
export const heroes = heroesData as Hero[];

/**
 * Реестр билдов по id героя.
 * При добавлении нового героя: создать файл builds/{id}.json,
 * импортировать его выше и добавить строку в этот объект.
 */
export const heroBuilds: Record<string, HeroBuildSet> = {
  bastet: bastetBuild as HeroBuildSet,
};

/** Найти героя по id */
export function getHeroById(heroId: string): Hero | null {
  return heroes.find((hero) => hero.id === heroId) ?? null;
}

/** Получить набор билдов героя по id */
export function getHeroBuildSet(heroId: string): HeroBuildSet | null {
  return heroBuilds[heroId] ?? null;
}
