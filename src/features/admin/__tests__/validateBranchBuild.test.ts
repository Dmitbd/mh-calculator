import branches from "@/features/game-data/divinity/divinity-branches.json";
import skills from "@/features/game-data/divinity/divinity-skills.json";
import template from "@/features/game-data/divinity/tree-template.json";
import weaponAwakeningColors from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningSlots from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";

import { slugifyFileName } from "../utils/slugifyFileName";
import { validateBranchBuild } from "../utils/validateBranchBuild";
import type {
  BranchColumnId,
  DivinityBranchBuildDraft,
  DivinityBranchId,
  DivinityMajorSkill,
} from "../types/admin.types";

const catalogSkills = skills as DivinityMajorSkill[];

const branchById = new Map(branches.map((branch) => [branch.id, branch]));
const skillByBranch = new Map<string, DivinityMajorSkill>();

for (const skill of catalogSkills) {
  if (!skillByBranch.has(skill.branchId)) {
    skillByBranch.set(skill.branchId, skill);
  }
}

const columns: Record<BranchColumnId, DivinityBranchId> = {
  left: "asterial",
  center: "psyche",
  right: "immortality",
};

const filledWeaponAwakening = weaponAwakeningSlots.map((slot) => ({
  slot: slot.slot,
  colorId: "red" as const,
}));

function createValidDraft(): DivinityBranchBuildDraft {
  return {
    gameMode: "pve",
    heroName: "Western Queen",
    columns,
    weaponAwakening: filledWeaponAwakening,
    majorNodes: template
      .filter((node) => node.nodeType === "majorSkill")
      .map((node) => {
        const branchId = columns[node.columnId as BranchColumnId];
        const skill = skillByBranch.get(branchId);

        if (!skill) {
          throw new Error(`Missing test skill for ${branchId}`);
        }

        return {
          level: node.level,
          columnId: node.columnId as BranchColumnId,
          branchId,
          skillId: skill.id,
        };
      }),
  };
}

describe("slugifyFileName", () => {
  it("builds a json file name from a hero name", () => {
    expect(slugifyFileName("Apollo")).toBe("apollo.json");
    expect(slugifyFileName("Western Queen")).toBe("western-queen.json");
    expect(slugifyFileName("Oda Nobunaga")).toBe("oda-nobunaga.json");
  });
});

describe("validateBranchBuild", () => {
  it("accepts a completed branch build", () => {
    const result = validateBranchBuild(createValidDraft(), {
      branches,
      skills: catalogSkills,
      template,
      weaponAwakeningColors,
      weaponAwakeningSlots,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty hero name", () => {
    const result = validateBranchBuild(
      { ...createValidDraft(), heroName: "   " },
      {
        branches,
        skills: catalogSkills,
        template,
        weaponAwakeningColors,
        weaponAwakeningSlots,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "heroName.required",
      message: "Hero name is required.",
    });
  });

  it("rejects missing major node selections", () => {
    const draft = createValidDraft();
    const [missingNode, ...remainingNodes] = draft.majorNodes;

    const result = validateBranchBuild(
      { ...draft, majorNodes: remainingNodes },
      {
        branches,
        skills: catalogSkills,
        template,
        weaponAwakeningColors,
        weaponAwakeningSlots,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "majorNode.required",
      message: "Major skill is required for center level 1.",
      path: `majorNodes.${missingNode.columnId}.${missingNode.level}`,
    });
  });

  it("rejects a skill selected from another branch", () => {
    const draft = createValidDraft();
    const psycheSkill = skillByBranch.get("psyche");

    if (!psycheSkill) {
      throw new Error("Missing psyche test skill");
    }

    const result = validateBranchBuild(
      {
        ...draft,
        majorNodes: draft.majorNodes.map((node) =>
          node.columnId === "left" && node.level === 3
            ? { ...node, skillId: psycheSkill.id }
            : node,
        ),
      },
      {
        branches,
        skills: catalogSkills,
        template,
        weaponAwakeningColors,
        weaponAwakeningSlots,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "majorNode.skillBranchMismatch",
      message: "Selected skill does not belong to asterial.",
      path: "majorNodes.left.3",
    });
  });

  it("rejects missing weapon awakening slots", () => {
    const draft = createValidDraft();

    const result = validateBranchBuild(
      { ...draft, weaponAwakening: [{ slot: 1, colorId: "red" }] },
      {
        branches,
        skills: catalogSkills,
        template,
        weaponAwakeningColors,
        weaponAwakeningSlots,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "weaponAwakening.slotRequired",
      message: "Weapon awakening color is required for slot 2.",
      path: "weaponAwakening.2",
    });
  });

  it("rejects unknown branch ids", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        columns: { ...columns, left: "unknown" as DivinityBranchId },
      },
      {
        branches,
        skills: catalogSkills,
        template,
        weaponAwakeningColors,
        weaponAwakeningSlots,
      },
    );

    expect(branchById.has("unknown")).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "column.branchUnknown",
      message: "Unknown branch selected for left.",
      path: "columns.left",
    });
  });
});
