import type { Hero } from "@/features/heroes/types/heroes.types";
import {
  filterHeroes,
  matchesHeroSearch,
} from "@/features/heroes/utils/heroListFilters";

const sampleHeroes: Hero[] = [
  {
    id: "bastet",
    name: { en: "Bastet", ru: "Бастет" },
    icon: "/img/heroes/bastet.png",
    rarity: "ssr",
    role: "fighter",
    damageType: "physical",
    element: "water",
    factions: ["verdian"],
    releaseDate: "2025-02-02",
  },
  {
    id: "zeus",
    name: { en: "Zeus", ru: "Зевс" },
    icon: "/img/heroes/zeus.png",
    rarity: "ssr",
    role: "mage",
    damageType: "magical",
    element: "earth",
    factions: ["luminarch"],
    releaseDate: null,
  },
  {
    id: "lucifer",
    name: { en: "Lucifer", ru: "Люцифер" },
    icon: "/img/heroes/lucifer.png",
    rarity: "ur",
    role: "fighter",
    damageType: "physical",
    element: "metal",
    factions: ["luminarch", "shadowarch"],
    releaseDate: null,
  },
];

describe("matchesHeroSearch", () => {
  test("matches Russian name case-insensitively", () => {
    expect(matchesHeroSearch(sampleHeroes[0], "бас")).toBe(true);
  });

  test("matches English name case-insensitively", () => {
    expect(matchesHeroSearch(sampleHeroes[0], "BAST")).toBe(true);
  });

  test("ignores leading and trailing spaces", () => {
    expect(matchesHeroSearch(sampleHeroes[0], "  bastet  ")).toBe(true);
  });
});

describe("filterHeroes", () => {
  test("filters by role", () => {
    const result = filterHeroes(sampleHeroes, {
      search: "",
      roleId: "mage",
      factionId: null,
      elementId: null,
    });

    expect(result.map((hero) => hero.id)).toEqual(["zeus"]);
  });

  test("filters by faction", () => {
    const result = filterHeroes(sampleHeroes, {
      search: "",
      roleId: null,
      factionId: "verdian",
      elementId: null,
    });

    expect(result.map((hero) => hero.id)).toEqual(["bastet"]);
  });

  test("filters by element", () => {
    const result = filterHeroes(sampleHeroes, {
      search: "",
      roleId: null,
      factionId: null,
      elementId: "metal",
    });

    expect(result.map((hero) => hero.id)).toEqual(["lucifer"]);
  });

  test("combined filters use AND logic", () => {
    const result = filterHeroes(sampleHeroes, {
      search: "ba",
      roleId: "fighter",
      factionId: "verdian",
      elementId: null,
    });

    expect(result.map((hero) => hero.id)).toEqual(["bastet"]);
  });
});
