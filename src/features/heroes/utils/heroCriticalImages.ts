import {
  getDictionaryEntry,
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
} from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/game-data/heroes/types";

export const HERO_CATALOG_PRELOAD_CARD_LIMIT = 4;

const filterImageSources = [
  ...heroRoles,
  ...heroFactions,
  ...heroElements,
].map((entry) => entry.icon);

/** Images shown in the compact metadata for one selected hero. */
export function getHeroMetadataImageSources(hero: Hero): string[] {
  const entries = [
    getDictionaryEntry(heroRarities, hero.rarity),
    getDictionaryEntry(heroRoles, hero.role),
    ...hero.factions.map((id) => getDictionaryEntry(heroFactions, id)),
    getDictionaryEntry(heroElements, hero.element),
  ];

  return [
    hero.icon,
    ...entries.flatMap((entry) => (entry ? [entry.icon] : [])),
  ];
}
/** Filter icons plus only the first cards that can occupy the initial viewport. */
export function getHeroCatalogCriticalImageSources(
  visibleHeroes: readonly Hero[],
): string[] {
  return [
    ...filterImageSources,
    ...visibleHeroes
      .slice(0, HERO_CATALOG_PRELOAD_CARD_LIMIT)
      .flatMap(getHeroMetadataImageSources),
  ];
}
