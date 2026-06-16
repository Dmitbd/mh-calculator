import type { Hero } from "@/features/heroes/types/heroes.types";
import {
  getHeroZoneId,
  groupHeroesByZone,
  HERO_ZONE_ORDER,
} from "@/features/heroes/utils/heroListGrouping";

function makeHero(partial: Partial<Hero> & Pick<Hero, "id" | "rarity" | "factions">): Hero {
  return {
    name: { en: partial.id, ru: partial.id },
    icon: `/img/heroes/${partial.id}.png`,
    role: "fighter",
    damageType: "physical",
    element: "fire",
    releaseDate: null,
    ...partial,
  };
}

describe("getHeroZoneId", () => {
  test("places UR heroes in UR zone", () => {
    expect(
      getHeroZoneId(
        makeHero({
          id: "lucifer",
          rarity: "ur",
          factions: ["luminarch", "shadowarch"],
        }),
      ),
    ).toBe("ur");
  });

  test("places SSR Luminarch heroes in Light zone", () => {
    expect(
      getHeroZoneId(makeHero({ id: "zeus", rarity: "ssr", factions: ["luminarch"] })),
    ).toBe("luminarch");
  });

  test("places SSR Shadowarch heroes in Dark zone", () => {
    expect(
      getHeroZoneId(makeHero({ id: "hades", rarity: "ssr", factions: ["shadowarch"] })),
    ).toBe("shadowarch");
  });

  test("places SSR Guardian heroes in Guardian zone", () => {
    expect(
      getHeroZoneId(makeHero({ id: "hercules", rarity: "ssr", factions: ["guardian"] })),
    ).toBe("guardian");
  });

  test("places SSR Verdian heroes in Forest zone", () => {
    expect(
      getHeroZoneId(makeHero({ id: "bastet", rarity: "ssr", factions: ["verdian"] })),
    ).toBe("verdian");
  });
});

describe("groupHeroesByZone", () => {
  const heroes = [
    makeHero({ id: "z-ur", rarity: "ur", factions: ["luminarch"] }),
    makeHero({ id: "a-light", rarity: "ssr", factions: ["luminarch"], name: { en: "A", ru: "А" } }),
    makeHero({ id: "b-dark", rarity: "ssr", factions: ["shadowarch"], name: { en: "B", ru: "Б" } }),
  ];

  test("removes empty zones", () => {
    const groups = groupHeroesByZone(heroes);
    expect(groups.map((group) => group.zoneId)).toEqual(["ur", "luminarch", "shadowarch"]);
  });

  test("keeps stable zone order", () => {
    const groups = groupHeroesByZone(heroes);
    const order = groups.map((group) => group.zoneId);

    for (let index = 1; index < order.length; index += 1) {
      expect(HERO_ZONE_ORDER.indexOf(order[index])).toBeGreaterThan(
        HERO_ZONE_ORDER.indexOf(order[index - 1]),
      );
    }
  });

  test("sorts heroes inside zone by Russian name", () => {
    const grouped = groupHeroesByZone([
      makeHero({ id: "z", rarity: "ssr", factions: ["luminarch"], name: { en: "Z", ru: "Я" } }),
      makeHero({ id: "a", rarity: "ssr", factions: ["luminarch"], name: { en: "A", ru: "А" } }),
    ]);

    expect(grouped[0].heroes.map((hero) => hero.name.ru)).toEqual(["А", "Я"]);
  });
});
