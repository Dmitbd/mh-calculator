import {
  heroBuilds,
  heroes,
  heroesWithBuilds,
  hasReadyBuild,
} from "@/features/game-data/heroes/heroBuilds";
import { getIconicWeaponHeroClass } from "@/features/game-data/weapon-awakening/weaponAwakeningBonuses";
import { heroElements } from "@/features/game-data/heroes/heroDictionaries";
import { heroFactions } from "@/features/game-data/heroes/heroDictionaries";
import { heroRarities } from "@/features/game-data/heroes/heroDictionaries";
import { heroRoles } from "@/features/game-data/heroes/heroDictionaries";
import { hasReadyBuildInTabs, validateHeroBuildTabs } from "@/features/heroes/utils/heroBuildTabs";
import type { HeroBuildTab } from "@/features/heroes/types/heroes.types";

function assertNoTargetTabPathInCommittedBuild(tab: HeroBuildTab) {
  if (tab.build) {
    expect("targetTabPath" in tab.build).toBe(false);
  }

  tab.children?.forEach(assertNoTargetTabPathInCommittedBuild);
}

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

  test("every hero maps to an iconic weapon class", () => {
    for (const hero of heroes) {
      expect(getIconicWeaponHeroClass(hero)).not.toBeNull();
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

  test("fully empty build set is excluded from heroesWithBuilds", () => {
    const emptyBuildSet = {
      schemaVersion: 2 as const,
      tabs: [
        {
          id: "pvp",
          label: "PvP",
          order: 1,
          kind: "build" as const,
          build: null,
        },
        {
          id: "pve",
          label: "PvE",
          order: 2,
          kind: "group" as const,
          build: null,
          children: [
            {
              id: "bosses",
              label: "Боссы",
              order: 1,
              kind: "build" as const,
              build: null,
            },
          ],
        },
      ],
    };

    expect(hasReadyBuild(emptyBuildSet)).toBe(false);
    expect(hasReadyBuildInTabs(emptyBuildSet.tabs)).toBe(false);
  });

  test("bastet build file uses schema version 2", () => {
    expect(heroBuilds.bastet.schemaVersion).toBe(2);
  });

  test("bastet build tabs have valid structure", () => {
    expect(validateHeroBuildTabs(heroBuilds.bastet)).toEqual([]);
  });

  test("bastet top-level tabs define gameMode", () => {
    expect(heroBuilds.bastet.tabs.find((tab) => tab.id === "pvp")?.gameMode).toBe("pvp");
    expect(heroBuilds.bastet.tabs.find((tab) => tab.id === "pve")?.gameMode).toBe("pve");
    expect(heroBuilds.bastet.tabs.find((tab) => tab.id === "pvp")?.build?.gameMode).toBe("pvp");
  });

  test("bastet has no duplicate sibling tab ids", () => {
    const rootIds = heroBuilds.bastet.tabs.map((tab) => tab.id);

    expect(new Set(rootIds).size).toBe(rootIds.length);
  });

  test("committed hero builds do not store targetTabPath inside nested builds", () => {
    for (const buildSet of Object.values(heroBuilds)) {
      buildSet.tabs.forEach(assertNoTargetTabPathInCommittedBuild);
    }
  });

  test("bastet has at least one ready nested build", () => {
    expect(hasReadyBuildInTabs(heroBuilds.bastet.tabs)).toBe(true);
    expect(hasReadyBuild(heroBuilds.bastet)).toBe(true);
  });
});
