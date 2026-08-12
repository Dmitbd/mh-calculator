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

export type BuilderHeroLists = {
  notCreatedHeroes: Hero[];
  notPublishedHeroes: Hero[];
};

export function getBuilderHeroLists(params: {
  heroes: readonly Hero[];
  draftHeroIds: readonly string[];
  publishedHeroIds: readonly string[];
}): BuilderHeroLists {
  const draftIds = new Set(params.draftHeroIds);
  const publishedIds = new Set(params.publishedHeroIds);

  return params.heroes.reduce<BuilderHeroLists>(
    (lists, hero) => {
      if (publishedIds.has(hero.id)) return lists;
      if (draftIds.has(hero.id)) lists.notPublishedHeroes.push(hero);
      else lists.notCreatedHeroes.push(hero);
      return lists;
    },
    { notCreatedHeroes: [], notPublishedHeroes: [] },
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
