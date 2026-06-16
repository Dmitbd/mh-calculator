import {
  heroBuilds,
  heroes,
  heroesWithBuilds,
  hasReadyBuild,
} from "@/features/game-data/heroes/heroBuilds";
import { heroElements } from "@/features/game-data/heroes/heroDictionaries";
import { heroFactions } from "@/features/game-data/heroes/heroDictionaries";
import { heroRarities } from "@/features/game-data/heroes/heroDictionaries";
import { heroRoles } from "@/features/game-data/heroes/heroDictionaries";

const rarityIds = new Set(heroRarities.map((entry) => entry.id));
const roleIds = new Set(heroRoles.map((entry) => entry.id));
const elementIds = new Set(heroElements.map((entry) => entry.id));
const factionIds = new Set(heroFactions.map((entry) => entry.id));

describe("master hero catalog", () => {
  test("every hero has required fields", () => {
    for (const hero of heroes) {
      expect(hero.id).toBeTruthy();
      expect(hero.name.en).toBeTruthy();
      expect(hero.name.ru).toBeTruthy();
      expect(hero.icon).toBeTruthy();
      expect(hero.rarity).toBeTruthy();
      expect(hero.role).toBeTruthy();
      expect(hero.element).toBeTruthy();
      expect(hero.factions.length).toBeGreaterThan(0);
    }
  });

  test("every hero rarity is ur or ssr", () => {
    for (const hero of heroes) {
      expect(["ur", "ssr"]).toContain(hero.rarity);
    }
  });

  test("dictionary references are valid", () => {
    for (const hero of heroes) {
      expect(rarityIds.has(hero.rarity)).toBe(true);
      expect(roleIds.has(hero.role)).toBe(true);
      expect(elementIds.has(hero.element)).toBe(true);

      for (const faction of hero.factions) {
        expect(factionIds.has(faction)).toBe(true);
      }
    }
  });

  test("hero ids are unique", () => {
    const ids = heroes.map((hero) => hero.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("hero icons use local heroes path", () => {
    for (const hero of heroes) {
      expect(hero.icon.startsWith("/img/heroes/")).toBe(true);
    }
  });
});

describe("build registry", () => {
  test("every heroBuilds key exists in heroes.json", () => {
    const heroIds = new Set(heroes.map((hero) => hero.id));

    for (const heroId of Object.keys(heroBuilds)) {
      expect(heroIds.has(heroId)).toBe(true);
    }
  });

  test("heroesWithBuilds includes only heroes with ready builds", () => {
    for (const hero of heroesWithBuilds) {
      expect(hasReadyBuild(heroBuilds[hero.id])).toBe(true);
    }
  });

  test("heroesWithBuilds excludes heroes without ready builds", () => {
    const withBuildIds = new Set(heroesWithBuilds.map((hero) => hero.id));

    for (const hero of heroes) {
      if (!hasReadyBuild(heroBuilds[hero.id])) {
        expect(withBuildIds.has(hero.id)).toBe(false);
      }
    }
  });

  test("fully null build set is excluded from heroesWithBuilds", () => {
    expect(hasReadyBuild({ pve: null, pvp: null })).toBe(false);
  });
});
