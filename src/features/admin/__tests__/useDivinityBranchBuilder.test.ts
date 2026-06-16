import { act, renderHook } from "@testing-library/react-native";

import template from "@/features/game-data/divinity/tree-template.json";
import weaponAwakeningColors from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningSlots from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";

import { useDivinityBranchBuilder } from "../hooks/useDivinityBranchBuilder";
import type { WeaponAwakeningColor } from "../types/admin.types";
import type {
  BranchColumnId,
  DivinityBranchId,
} from "../types/admin.types";

const selectedBranches: Record<BranchColumnId, DivinityBranchId> = {
  left: "asterial",
  center: "psyche",
  right: "immortality",
};

const weaponAwakeningCatalog = {
  colors: weaponAwakeningColors as WeaponAwakeningColor[],
  slots: weaponAwakeningSlots,
};

const filledWeaponAwakening = weaponAwakeningSlots.map((slot) => ({
  slot: slot.slot,
  colorId: "red" as const,
}));

const selectedSkills: Record<string, string> = {
  "center:1": "psyche-maestro",
  "left:3": "asterial-gemini",
  "right:3": "immortality-savvy",
  "center:7": "psyche-deftness",
  "left:10": "asterial-annihilation",
  "right:10": "immortality-wrath",
  "center:13": "psyche-torment",
  "left:15": "asterial-supernova",
  "right:15": "immortality-symbiosis",
};

describe("useDivinityBranchBuilder", () => {
  it("starts with an empty editable draft", () => {
    const { result } = renderHook(() => useDivinityBranchBuilder(weaponAwakeningCatalog));

    expect(result.current.gameMode).toBe("pve");
    expect(result.current.targetTabPath).toEqual(["pve", "bosses"]);
    expect(result.current.heroName).toBe("");
    expect(result.current.selectedBranches).toEqual({
      left: null,
      center: null,
      right: null,
    });
    expect(result.current.selectedMajorSkills).toEqual({});
    expect(result.current.weaponAwakeningSelections).toEqual({});
    expect(result.current.selectedArtifactId).toBeNull();
    expect(result.current.selectedRuneId).toBeNull();
    expect(result.current.buildExport("2026-05-30T00:00:00.000Z")).toBeNull();
  });

  it("stores user selections and builds the export json payload", () => {
    const { result } = renderHook(() => useDivinityBranchBuilder(weaponAwakeningCatalog));

    act(() => {
      result.current.setHeroName("Western Queen");
      result.current.setColumnBranch("left", selectedBranches.left);
      result.current.setColumnBranch("center", selectedBranches.center);
      result.current.setColumnBranch("right", selectedBranches.right);

      for (const node of template) {
        if (node.nodeType === "majorSkill") {
          result.current.setMajorSkill(
            node.columnId as BranchColumnId,
            node.level,
            selectedSkills[`${node.columnId}:${node.level}`],
          );
        }
      }

      for (const slot of weaponAwakeningSlots) {
        result.current.cycleWeaponAwakeningSlot(slot.slot);
      }

      result.current.setArtifact("excalibur");
      result.current.setRune("fire");
    });

    expect(result.current.getMajorSkill("center", 1)).toBe("psyche-maestro");
    expect(result.current.buildExport("2026-05-30T00:00:00.000Z")?.targetTabPath).toEqual([
      "pve",
      "bosses",
    ]);
    expect(result.current.buildExport("2026-05-30T00:00:00.000Z")).toEqual({
      schemaVersion: 1,
      gameMode: "pve",
      targetTabPath: ["pve", "bosses"],
      heroName: "Western Queen",
      columns: selectedBranches,
      weaponAwakening: filledWeaponAwakening,
      equipment: { artifactId: "excalibur", runeId: "fire" },
      majorNodes: [
        {
          level: 1,
          columnId: "center",
          branchId: "psyche",
          skillId: "psyche-maestro",
        },
        {
          level: 3,
          columnId: "left",
          branchId: "asterial",
          skillId: "asterial-gemini",
        },
        {
          level: 3,
          columnId: "right",
          branchId: "immortality",
          skillId: "immortality-savvy",
        },
        {
          level: 7,
          columnId: "center",
          branchId: "psyche",
          skillId: "psyche-deftness",
        },
        {
          level: 10,
          columnId: "left",
          branchId: "asterial",
          skillId: "asterial-annihilation",
        },
        {
          level: 10,
          columnId: "right",
          branchId: "immortality",
          skillId: "immortality-wrath",
        },
        {
          level: 13,
          columnId: "center",
          branchId: "psyche",
          skillId: "psyche-torment",
        },
        {
          level: 15,
          columnId: "left",
          branchId: "asterial",
          skillId: "asterial-supernova",
        },
        {
          level: 15,
          columnId: "right",
          branchId: "immortality",
          skillId: "immortality-symbiosis",
        },
      ],
      progress: {},
      activeNodes: [],
      metadata: {
        createdAt: "2026-05-30T00:00:00.000Z",
        source: "manual-branch-builder",
      },
    });
  });

  it("selecting PvP sets target path to pvp", () => {
    const { result } = renderHook(() => useDivinityBranchBuilder(weaponAwakeningCatalog));

    act(() => {
      result.current.setTargetTopTab("pvp");
    });

    expect(result.current.targetTabPath).toEqual(["pvp"]);
    expect(result.current.gameMode).toBe("pvp");
  });

  it("selecting PvE bosses sets target path to pve bosses", () => {
    const { result } = renderHook(() => useDivinityBranchBuilder(weaponAwakeningCatalog));

    act(() => {
      result.current.setTargetTopTab("pve");
      result.current.setTargetChildTab("bosses");
    });

    expect(result.current.targetTabPath).toEqual(["pve", "bosses"]);
    expect(result.current.gameMode).toBe("pve");
  });

  it("selecting PvE campaign sets target path to pve campaign", () => {
    const { result } = renderHook(() => useDivinityBranchBuilder(weaponAwakeningCatalog));

    act(() => {
      result.current.setTargetTopTab("pve");
      result.current.setTargetChildTab("campaign");
    });

    expect(result.current.targetTabPath).toEqual(["pve", "campaign"]);
    expect(result.current.gameMode).toBe("pve");
  });
});
