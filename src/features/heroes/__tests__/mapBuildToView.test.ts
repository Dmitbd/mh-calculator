import type { DivinityBranchBuildExport } from "@/features/game-data/builds/types";

import { mapBuildToView } from "../utils/mapBuildToView";

const pve: DivinityBranchBuildExport = {
  schemaVersion: 1,
  gameMode: "pve",
  heroId: "western-queen",
  heroName: "Western Queen",
  columns: {
    left: "asterial",
    center: "psyche",
    right: "immortality",
  },
  majorNodes: [
    { level: 1, columnId: "center", branchId: "psyche", skillId: "psyche-energy-bubble" },
    { level: 3, columnId: "left", branchId: "asterial", skillId: "asterial-gemini" },
    { level: 3, columnId: "right", branchId: "immortality", skillId: "immortality-transcend" },
    { level: 7, columnId: "center", branchId: "psyche", skillId: "psyche-maestro" },
    { level: 10, columnId: "left", branchId: "asterial", skillId: "asterial-annihilation" },
    { level: 10, columnId: "right", branchId: "immortality", skillId: "immortality-waterdrop" },
    { level: 13, columnId: "center", branchId: "psyche", skillId: "psyche-torment" },
    { level: 15, columnId: "left", branchId: "asterial", skillId: "asterial-supernova" },
    { level: 15, columnId: "right", branchId: "immortality", skillId: "immortality-resonance" },
  ],
  weaponAwakening: [
    { slot: 1, colorId: "red" },
    { slot: 2, colorId: "red" },
    { slot: 3, colorId: "red" },
    { slot: 4, colorId: "red" },
    { slot: 5, colorId: "yellow" },
    { slot: 6, colorId: "yellow" },
    { slot: 7, colorId: "yellow" },
    { slot: 8, colorId: "yellow" },
  ],
  equipment: { artifactIds: ["excalibur"], runeIds: ["fire"] },
  divinitySkills: {
    base: ["asterial-gemini", "asterial-annihilation", "asterial-supernova"],
    awakened: ["devoid-animus", "devoid-broken-mirror", "devoid-chaotic-power"],
  },
  progress: { left: 10, center: 13, right: 10 },
  activeNodes: [],
  metadata: {
    createdAt: "2026-05-30T00:00:00.000Z",
    source: "manual-branch-builder",
  },
};

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

    expect(view.selectedMajorSkills["center:1"]).toBe("psyche-energy-bubble");
    expect(view.selectedMajorSkills["left:15"]).toBe("asterial-supernova");
    expect(view.selectedMajorSkills["right:3"]).toBe("immortality-transcend");
    expect(Object.keys(view.selectedMajorSkills)).toHaveLength(9);
  });

  it("переносит прогресс и экипировку", () => {
    const view = mapBuildToView(pve);

    expect(view.progressLevels).toEqual({ left: 10, center: 13, right: 10 });
    expect(view.artifactIds).toEqual(["excalibur"]);
    expect(view.runeIds).toEqual(["fire"]);
  });

  it("сохраняет порядок вариантов экипировки", () => {
    const view = mapBuildToView({
      ...pve,
      equipment: {
        artifactIds: ["axe-of-pangu", "staff-of-sharur"],
        runeIds: ["air", "fire", "thunder"],
      },
    });

    expect(view.artifactIds).toEqual(["axe-of-pangu", "staff-of-sharur"]);
    expect(view.runeIds).toEqual(["air", "fire", "thunder"]);
  });

  it("строит карту цветов пробуждения оружия по слотам", () => {
    const view = mapBuildToView(pve);

    expect(view.weaponAwakeningSelections[1]).toBe("red");
    expect(view.weaponAwakeningSelections[8]).toBe("yellow");
    expect(Object.keys(view.weaponAwakeningSelections)).toHaveLength(8);
  });

  it("переносит выбранные навыки божественности", () => {
    const view = mapBuildToView(pve);

    expect(view.divinitySkills).toEqual({
      base: ["asterial-gemini", "asterial-annihilation", "asterial-supernova"],
      awakened: [
        "devoid-animus",
        "devoid-broken-mirror",
        "devoid-chaotic-power",
      ],
    });
  });

  it("использует пустой выбор навыков божественности для старого билда", () => {
    const { divinitySkills: _divinitySkills, ...legacyBuild } = pve;
    const view = mapBuildToView(legacyBuild);

    expect(view.divinitySkills).toEqual({ base: [] });
  });
});
