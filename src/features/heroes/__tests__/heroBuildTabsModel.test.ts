import type { HeroBuildTab } from "@/features/game-data/heroes";

import { getHeroBuildTabViewModel } from "../model/heroBuildTabs";

const tabs: HeroBuildTab[] = [
  { id: "pvp", label: "PvP", order: 2, kind: "build", build: null },
  {
    id: "pve",
    label: "PvE",
    order: 1,
    kind: "group",
    build: null,
    children: [
      { id: "bosses", label: "Боссы", order: 1, kind: "build", build: null },
    ],
  },
];

test("derives folder tabs for active hero build path", () => {
  const model = getHeroBuildTabViewModel(tabs, ["pve", "bosses"]);

  expect(model.activeTopId).toBe("pve");
  expect(model.activeChildId).toBe("bosses");
  expect(model.topFolderTabs.map((tab) => tab.id)).toEqual(["pve", "pvp"]);
  expect(model.childFolderTabs.map((tab) => tab.id)).toEqual(["bosses"]);
});
