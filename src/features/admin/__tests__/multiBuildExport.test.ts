import type { DivinityBranchBuildExport } from "@/features/game-data/builds/types";
import { validateHeroBuildTabs } from "@/features/game-data/heroes";

import {
  buildHeroBuildSetFromSavedBuilds,
  getBuildTargetLeafTabs,
  getBuildTargetPathKey,
  getBuildTargetPathLabel,
} from "../model/multiBuildExport";
import { buildTargetTabs } from "../data/buildTargetTabs";

const build = (gameMode: "pvp" | "pve"): DivinityBranchBuildExport => ({
  schemaVersion: 1,
  gameMode,
  heroId: "bastet",
  heroName: "Бастет",
  columns: { left: "asterial", center: "psyche", right: "immortality" },
  majorNodes: [],
  weaponAwakening: [],
  equipment: { artifactIds: ["axe-of-pangu"], runeIds: ["air"] },
  progress: {},
  activeNodes: [],
  metadata: {
    createdAt: "2026-06-22T00:00:00.000Z",
    source: "manual-branch-builder",
  },
});

describe("multiBuildExport target helpers", () => {
  test("returns all build target leaf paths", () => {
    expect(getBuildTargetLeafTabs(buildTargetTabs).map((leaf) => leaf.path)).toEqual([
      ["pvp"],
      ["pve", "bosses"],
      ["pve", "campaign"],
    ]);
  });

  test("creates stable path keys and labels", () => {
    expect(getBuildTargetPathKey(["pve", "bosses"])).toBe("pve/bosses");
    expect(getBuildTargetPathLabel(buildTargetTabs, ["pve", "bosses"])).toBe(
      "PvE -> Боссы",
    );
  });
});

describe("multiBuildExport assembly", () => {
  test("builds a schema v2 hero build set from saved leaf builds", () => {
    const buildSet = buildHeroBuildSetFromSavedBuilds(buildTargetTabs, {
      pvp: build("pvp"),
      "pve/bosses": build("pve"),
      "pve/campaign": build("pve"),
    });

    expect(buildSet.schemaVersion).toBe(2);
    expect(buildSet.tabs[0].build?.gameMode).toBe("pvp");
    expect(buildSet.tabs[1].children?.[0].build?.gameMode).toBe("pve");
    expect("targetTabPath" in buildSet.tabs[0].build!).toBe(false);
    expect(validateHeroBuildTabs(buildSet)).toEqual([]);
  });
});
