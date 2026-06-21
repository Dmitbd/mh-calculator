import { divinityBranches } from "@/features/game-data/divinity";
import {
  equipmentArtifacts,
  equipmentRunes,
} from "@/features/game-data/equipment";
import {
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
  heroes,
} from "@/features/game-data/heroes";
import { weaponAwakeningColors } from "@/features/game-data/weapon-awakening";

function expectPublicImagePath(path: string) {
  expect(path).toMatch(/^\/img\//);
}

test("catalog image paths use public img paths", () => {
  heroes.forEach((hero) => {
    expectPublicImagePath(hero.icon);
  });
  [...heroElements, ...heroFactions, ...heroRarities, ...heroRoles].forEach(
    (entry) => {
      expectPublicImagePath(entry.icon);
    },
  );
  divinityBranches.forEach((branch) => {
    expectPublicImagePath(branch.icon);
  });
  [...equipmentArtifacts, ...equipmentRunes].forEach((item) => {
    expectPublicImagePath(item.icon);
  });
  weaponAwakeningColors.forEach((color) => {
    if (color.icon) {
      expectPublicImagePath(color.icon);
    }
  });
});
