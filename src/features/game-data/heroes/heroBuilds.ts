import type { Hero, HeroBuildSet } from "@/features/game-data/heroes/types";
import { hasReadyBuildInTabs } from "@/features/game-data/heroes/heroBuildTabs";

import heroesData from "./heroes.json";
import bastetBuild from "./builds/bastet.json";

/** Полный каталог героев UR/SSR */
export const heroes = heroesData as Hero[];

/**
 * Реестр билдов по id героя.
 * При добавлении нового героя: создать файл builds/{id}.json,
 * импортировать его выше и добавить строку в этот объект.
 */
export const heroBuilds: Record<string, HeroBuildSet> = {
  bastet: bastetBuild as HeroBuildSet,
};

/** Проверяет, есть ли у героя хотя бы один готовый билд */
export function hasReadyBuild(buildSet: HeroBuildSet | null | undefined): boolean {
  if (!buildSet || buildSet.schemaVersion !== 2) {
    return false;
  }

  return hasReadyBuildInTabs(buildSet.tabs);
}

/** Герои с хотя бы одним готовым билдом */
export const heroesWithBuilds = heroes.filter((hero) =>
  hasReadyBuild(heroBuilds[hero.id]),
);

/** Найти героя по id в полном каталоге */
export function getHeroById(heroId: string): Hero | null {
  return heroes.find((hero) => hero.id === heroId) ?? null;
}

/** Получить набор билдов героя по id */
export function getHeroBuildSet(heroId: string): HeroBuildSet | null {
  return heroBuilds[heroId] ?? null;
}
