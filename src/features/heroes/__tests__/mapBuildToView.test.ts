import type { DivinityBranchBuildExport } from "@/features/admin/types/admin.types";
import westernQueenBuild from "@/features/game-data/heroes/builds/western-queen.json";

import { mapBuildToView } from "../utils/mapBuildToView";

const pve = westernQueenBuild.pve as DivinityBranchBuildExport;

describe("mapBuildToView", () => {
  it("восстанавливает выбранные ветки из columns", () => {
    const view = mapBuildToView(pve);

    expect(view.selectedBranches).toEqual({
      left: "asterial",
      center: "psyche",
      right: "immortality",
    });
  });

  it("строит карту мажорных скиллов по ключу columnId:level", () => {
    const view = mapBuildToView(pve);

    expect(view.selectedMajorSkills["center:1"]).toBe("psyche-maestro");
    expect(view.selectedMajorSkills["left:15"]).toBe("asterial-supernova");
    expect(view.selectedMajorSkills["right:3"]).toBe("immortality-savvy");
    expect(Object.keys(view.selectedMajorSkills)).toHaveLength(9);
  });

  it("переносит прогресс и экипировку", () => {
    const view = mapBuildToView(pve);

    expect(view.progressLevels).toEqual({ left: 10, center: 13, right: 10 });
    expect(view.artifactId).toBe("excalibur");
    expect(view.runeId).toBe("fire");
  });

  it("строит карту цветов пробуждения оружия по слотам", () => {
    const view = mapBuildToView(pve);

    expect(view.weaponAwakeningSelections[1]).toBe("red");
    expect(view.weaponAwakeningSelections[8]).toBe("yellow");
    expect(Object.keys(view.weaponAwakeningSelections)).toHaveLength(8);
  });
});
