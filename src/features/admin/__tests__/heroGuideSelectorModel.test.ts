import type {
  Hero,
  HeroDictionaryEntry,
} from "@/features/game-data/heroes/types";

import {
  getBuilderHeroLists,
  getHeroGuideSelectorSections,
} from "../model/heroGuideSelector";

const hero = (
  id: string,
  rarity: Hero["rarity"],
  factions: Hero["factions"],
): Hero => ({
  id,
  name: { en: id, ru: id },
  icon: `/img/heroes/${id}.png`,
  rarity,
  role: "fighter",
  damageType: "physical",
  element: "fire",
  factions,
  releaseDate: null,
});

const factions: HeroDictionaryEntry[] = [
  { id: "luminarch", name: { en: "Light", ru: "Свет" }, icon: "/light.png", order: 1 },
  { id: "shadowarch", name: { en: "Dark", ru: "Тьма" }, icon: "/dark.png", order: 2 },
];

const heroes = [
  hero("ur-open", "ur", ["luminarch"]),
  hero("ssr-open", "ssr", ["luminarch"]),
  hero("ssr-multi", "ssr", ["luminarch", "shadowarch"]),
  hero("published", "ssr", ["shadowarch"]),
];

describe("hero guide selector model", () => {
  it("separates not-created and unfinished heroes", () => {
    const lists = getBuilderHeroLists({
      heroes,
      draftHeroIds: ["ssr-open"],
      publishedHeroIds: ["published"],
    });

    expect(lists.notCreatedHeroes.map(({ id }) => id)).toEqual([
      "ur-open",
      "ssr-multi",
    ]);
    expect(lists.notPublishedHeroes.map(({ id }) => id)).toEqual(["ssr-open"]);
  });

  it("lets published status dominate a stale draft", () => {
    const lists = getBuilderHeroLists({
      heroes,
      draftHeroIds: ["published"],
      publishedHeroIds: ["published"],
    });

    expect(lists.notCreatedHeroes).toEqual(heroes.filter(({ id }) => id !== "published"));
    expect(lists.notPublishedHeroes).toEqual([]);
  });

  it("puts UR first and groups only SSR heroes by ordered factions", () => {
    const sections = getHeroGuideSelectorSections(heroes, factions);

    expect(sections.urHeroes.map(({ id }) => id)).toEqual(["ur-open"]);
    expect(sections.ssrGroups.map(({ faction }) => faction.id)).toEqual([
      "luminarch",
      "shadowarch",
    ]);
    expect(sections.ssrGroups[0].heroes.map(({ id }) => id)).toEqual([
      "ssr-open",
      "ssr-multi",
    ]);
    expect(sections.ssrGroups[1].heroes.map(({ id }) => id)).toEqual([
      "ssr-multi",
      "published",
    ]);
  });
});
