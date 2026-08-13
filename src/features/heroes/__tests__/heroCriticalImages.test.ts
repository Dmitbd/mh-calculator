import { heroes } from "@/features/game-data/heroes";
import {
  getHeroCatalogCriticalImageSources,
  getHeroMetadataImageSources,
  HERO_CATALOG_PRELOAD_CARD_LIMIT,
} from "../utils/heroCriticalImages";

test("selects filters and only the bounded first visible hero cards", () => {
  const visibleHeroes = heroes.slice(0, HERO_CATALOG_PRELOAD_CARD_LIMIT + 2);

  const sources = getHeroCatalogCriticalImageSources(visibleHeroes);

  expect(sources).toContain(visibleHeroes[0].icon);
  expect(sources).toContain(
    visibleHeroes[HERO_CATALOG_PRELOAD_CARD_LIMIT - 1].icon,
  );
  for (const source of getHeroMetadataImageSources(
    visibleHeroes[HERO_CATALOG_PRELOAD_CARD_LIMIT - 1],
  )) {
    expect(sources).toContain(source);
  }
  expect(sources).not.toContain(visibleHeroes[HERO_CATALOG_PRELOAD_CARD_LIMIT].icon);
  expect(sources).toContain("/img/hero-roles/fighter.png");
  expect(sources).toContain("/img/hero-factions/luminarch.png");
  expect(sources).toContain("/img/hero-elements/fire.png");
  expect(new Set(sources).size).toBeLessThanOrEqual(24);
});

test("selects only the chosen hero metadata for the build header", () => {
  const bastet = heroes.find((hero) => hero.id === "bastet");

  expect(bastet).toBeDefined();
  expect(getHeroMetadataImageSources(bastet!)).toEqual(
    expect.arrayContaining([
      "/img/heroes/bastet.png",
      "/img/hero-rarities/ssr.png",
      "/img/hero-roles/fighter.png",
      "/img/hero-factions/verdian.png",
      "/img/hero-elements/water.png",
    ]),
  );
  expect(getHeroMetadataImageSources(bastet!)).not.toContain(
    "/img/heroes/morana.png",
  );
});
