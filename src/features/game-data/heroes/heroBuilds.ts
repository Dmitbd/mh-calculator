import type { Hero, HeroBuildSet } from "@/features/heroes/types/heroes.types";

import heroesData from "./heroes.json";
import auroraBuild from "./builds/aurora.json";
import westernQueenBuild from "./builds/western-queen.json";

/** Каталог героев для экрана выбора */
export const heroes = heroesData as Hero[];

/**
 * Реестр билдов по id героя.
 * При добавлении нового героя: создать файл builds/{id}.json,
 * импортировать его выше и добавить строку в этот объект.
 */
export const heroBuilds: Record<string, HeroBuildSet> = {
  "western-queen": westernQueenBuild as HeroBuildSet,
  aurora: auroraBuild as HeroBuildSet,
};

/** Найти героя по id */
export function getHeroById(heroId: string): Hero | null {
  return heroes.find((hero) => hero.id === heroId) ?? null;
}

/** Получить набор билдов героя по id */
export function getHeroBuildSet(heroId: string): HeroBuildSet | null {
  return heroBuilds[heroId] ?? null;
}
