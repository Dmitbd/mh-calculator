import {
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
} from "../catalog";

describe("divinity catalogs", () => {
  test("branches are sorted and have unique ids", () => {
    expect(new Set(divinityBranches.map((branch) => branch.id)).size).toBe(
      divinityBranches.length,
    );
    expect(divinityBranches.map((branch) => branch.order)).toEqual(
      [...divinityBranches].map((branch) => branch.order).sort((a, b) => a - b),
    );
  });

  test("skills reference known branches", () => {
    const branchIds = new Set(divinityBranches.map((branch) => branch.id));

    divinitySkills.forEach((skill) => {
      expect(branchIds.has(skill.branchId)).toBe(true);
    });
  });

  test("skill node costs match their tiers", () => {
    divinitySkills.forEach((skill) => {
      expect(skill.nodeCost).toBe(skill.tier);
    });
  });

  test("template references supported columns and node types", () => {
    const supportedColumns = new Set(["left", "center", "right"]);
    const supportedNodeTypes = new Set(["minorStat", "majorSkill"]);

    divinityTreeTemplate.forEach((node) => {
      expect(supportedColumns.has(node.columnId)).toBe(true);
      expect(supportedNodeTypes.has(node.nodeType)).toBe(true);
    });
  });
});
