import type {
  Hero,
  HeroDictionaryEntry,
  HeroFaction,
} from "@/features/game-data/heroes/types";

export type HeroGuideSelectorGroup = {
  faction: HeroDictionaryEntry;
  heroes: Hero[];
};

export type HeroGuideSelectorSections = {
  urHeroes: Hero[];
  ssrGroups: HeroGuideSelectorGroup[];
};

export function getSelectableBuilderHeroes(params: {
  heroes: readonly Hero[];
  publishedHeroIds: readonly string[];
  selectedHeroId: string | null;
}): Hero[] {
  const publishedIds = new Set(params.publishedHeroIds);

  return params.heroes.filter(
    (hero) => hero.id === params.selectedHeroId || !publishedIds.has(hero.id),
  );
}

export function getHeroGuideSelectorSections(
  heroes: readonly Hero[],
  factions: readonly HeroDictionaryEntry[],
): HeroGuideSelectorSections {
  const ssrHeroes = heroes.filter((hero) => hero.rarity === "ssr");
  const orderedFactions = [...factions].sort((left, right) => left.order - right.order);

  return {
    urHeroes: heroes.filter((hero) => hero.rarity === "ur"),
    ssrGroups: orderedFactions
      .map((faction) => ({
        faction,
        heroes: ssrHeroes.filter((hero) =>
          hero.factions.includes(faction.id as HeroFaction),
        ),
      }))
      .filter((group) => group.heroes.length > 0),
  };
}
