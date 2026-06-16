import branches from "@/features/game-data/divinity/divinity-branches.json";
import skills from "@/features/game-data/divinity/divinity-skills.json";
import template from "@/features/game-data/divinity/tree-template.json";
import artifacts from "@/features/game-data/equipment/artifacts.json";
import runes from "@/features/game-data/equipment/runes.json";
import heroes from "@/features/game-data/heroes/heroes.json";
import weaponAwakeningColors from "@/features/game-data/weapon-awakening/weapon-awakening-colors.json";
import weaponAwakeningSlots from "@/features/game-data/weapon-awakening/weapon-awakening-slots.json";

import { slugifyFileName } from "../utils/slugifyFileName";
import { validateBranchBuild } from "../utils/validateBranchBuild";
import type {
  BranchColumnId,
  DivinityBranchBuildValidationDraft,
  DivinityBranchId,
  DivinityMajorSkill,
} from "../types/admin.types";

const catalogSkills = skills as DivinityMajorSkill[];

const branchById = new Map(branches.map((branch) => [branch.id, branch]));
const skillByBranchAndTier = new Map<string, DivinityMajorSkill>();

for (const skill of catalogSkills) {
  skillByBranchAndTier.set(`${skill.branchId}:${skill.tier}`, skill);
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

const validationSources = {
  heroes,
  branches,
  skills: catalogSkills,
  template,
  weaponAwakeningColors,
  weaponAwakeningSlots,
  artifacts,
  runes,
};

function createValidDraft(): DivinityBranchBuildValidationDraft {
  return {
    gameMode: "pve",
    heroId: "western-queen",
    heroName: "Западная царица",
    columns,
    weaponAwakening: filledWeaponAwakening,
    equipment: { artifactIds: ["excalibur"], runeIds: ["fire"] },
    majorNodes: template
      .filter((node) => node.nodeType === "majorSkill")
      .map((node) => {
        const branchId = columns[node.columnId as BranchColumnId];
        const skill = skillByBranchAndTier.get(`${branchId}:${node.tier}`);

        if (!skill) {
          throw new Error(`Missing test skill for ${branchId} tier ${node.tier}`);
        }

        return {
          level: node.level,
          columnId: node.columnId as BranchColumnId,
          branchId,
          skillId: skill.id,
        };
      }),
    progress: {
      left: 18,
      center: 18,
      right: 18,
    },
  };
}

describe("slugifyFileName", () => {
  it("builds a json file name from a hero name", () => {
    expect(slugifyFileName("Apollo")).toBe("apollo.json");
    expect(slugifyFileName("Western Queen")).toBe("western-queen.json");
    expect(slugifyFileName("Oda Nobunaga")).toBe("oda-nobunaga.json");
    expect(slugifyFileName("Бастет")).toBe("bastet.json");
  });
});

describe("validateBranchBuild", () => {
  it("accepts a completed branch build", () => {
    const result = validateBranchBuild(createValidDraft(), validationSources);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a missing hero id", () => {
    const result = validateBranchBuild(
      { ...createValidDraft(), heroId: null, heroName: "   " },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "hero.required",
      message: "Выберите героя из списка.",
      path: "heroId",
    });
  });

  it("rejects an unknown hero id", () => {
    const result = validateBranchBuild(
      { ...createValidDraft(), heroId: "unknown-hero", heroName: "Unknown" },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "hero.unknown",
      message: "Выбранный герой отсутствует в базе.",
      path: "heroId",
    });
  });

  it("rejects a mismatched hero name", () => {
    const result = validateBranchBuild(
      { ...createValidDraft(), heroId: "western-queen", heroName: "Western Queen" },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "hero.nameMismatch",
      message: "Имя героя должно соответствовать выбранному герою из базы.",
      path: "heroName",
    });
  });

  it("rejects a missing artifact", () => {
    const result = validateBranchBuild(
      { ...createValidDraft(), equipment: { artifactIds: [], runeIds: ["fire"] } },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "equipment.artifactRequired",
      message: "Выберите оружие.",
      path: "equipment.artifactIds",
    });
  });

  it("rejects a missing rune", () => {
    const result = validateBranchBuild(
      { ...createValidDraft(), equipment: { artifactIds: ["excalibur"], runeIds: [] } },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "equipment.runeRequired",
      message: "Выберите руну.",
      path: "equipment.runeIds",
    });
  });

  it("rejects unknown artifact ids", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        equipment: { artifactIds: ["unknown-artifact"], runeIds: ["fire"] },
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "equipment.artifactUnknown",
      message: "Выбрано неизвестное оружие.",
      path: "equipment.artifactIds.0",
    });
  });

  it("rejects unknown rune ids", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        equipment: { artifactIds: ["excalibur"], runeIds: ["unknown-rune"] },
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "equipment.runeUnknown",
      message: "Выбрана неизвестная руна.",
      path: "equipment.runeIds.0",
    });
  });

  it("rejects duplicate artifact ids", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        equipment: { artifactIds: ["excalibur", "excalibur"], runeIds: ["fire"] },
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "equipment.artifactDuplicate",
      message: "Оружие уже добавлено в список вариантов.",
      path: "equipment.artifactIds.1",
    });
  });

  it("rejects duplicate rune ids", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        equipment: { artifactIds: ["excalibur"], runeIds: ["fire", "fire"] },
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "equipment.runeDuplicate",
      message: "Руна уже добавлена в список вариантов.",
      path: "equipment.runeIds.1",
    });
  });

  it("rejects missing major node selections", () => {
    const draft = createValidDraft();
    const [missingNode, ...remainingNodes] = draft.majorNodes;

    const result = validateBranchBuild(
      { ...draft, majorNodes: remainingNodes },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "majorNode.required",
      message: "Выберите крупный навык для центральной колонки на уровне 1.",
      path: `majorNodes.${missingNode.columnId}.${missingNode.level}`,
    });
  });

  it("rejects a skill selected from another branch", () => {
    const draft = createValidDraft();
    const psycheSkill = skillByBranchAndTier.get("psyche:1");

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
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "majorNode.skillBranchMismatch",
      message: "Выбранный навык не принадлежит ветке левой колонки.",
      path: "majorNodes.left.3",
    });
  });

  it("rejects missing weapon awakening slots", () => {
    const draft = createValidDraft();

    const result = validateBranchBuild(
      { ...draft, weaponAwakening: [{ slot: 1, colorId: "red" }] },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "weaponAwakening.slotRequired",
      message: "Выберите цвет пробуждения оружия для слота 2.",
      path: "weaponAwakening.2",
    });
  });

  it("rejects a skill with mismatched tier", () => {
    const draft = createValidDraft();
    const tier2Skill = skillByBranchAndTier.get("asterial:2");

    if (!tier2Skill) {
      throw new Error("Missing asterial tier 2 test skill");
    }

    const result = validateBranchBuild(
      {
        ...draft,
        majorNodes: draft.majorNodes.map((node) =>
          node.columnId === "left" && node.level === 3
            ? { ...node, skillId: tier2Skill.id }
            : node,
        ),
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "majorNode.skillTierMismatch",
      message: "Выбранный навык не подходит для слота tier 1 на уровне 3.",
      path: "majorNodes.left.3",
    });
  });

  it("rejects unknown branch ids", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        columns: { ...columns, left: "unknown" as DivinityBranchId },
      },
      validationSources,
    );

    expect(branchById.has("unknown")).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "column.branchUnknown",
      message: "Для левой колонки выбрана неизвестная ветка.",
      path: "columns.left",
    });
  });

  it("rejects progress below minimum level 18 for each column", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        progress: { left: 17, center: 18, right: 19 },
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "progress.minimumLevel",
      message: "Минимальный уровень левой ветки — 18.",
      path: "progress.left",
    });
  });

  it("rejects missing progress on any column", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        progress: { center: 20, right: 20 },
      },
      validationSources,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      code: "progress.minimumLevel",
      message: "Минимальный уровень левой ветки — 18.",
      path: "progress.left",
    });
  });

  it("accepts progress exactly at minimum level 18", () => {
    const result = validateBranchBuild(
      {
        ...createValidDraft(),
        progress: { left: 18, center: 18, right: 18 },
      },
      validationSources,
    );

    expect(result.isValid).toBe(true);
  });
});
