import {
  divinityBranchPointConnector,
  divinityBranches,
  divinityLevels,
  divinitySkills,
  divinityTreeTemplate,
} from "..";

const EXPECTED_TALENT_ICONS: Readonly<Record<string, string>> = {
  "Accuracy": "/img/divinity/talent-icons/talent-01.png",
  "Dodge": "/img/divinity/talent-icons/talent-02.png",
  "Crit chance": "/img/divinity/talent-icons/talent-03.png",
  "Crit damage": "/img/divinity/talent-icons/talent-04.png",
  "Physical resistance": "/img/divinity/talent-icons/talent-05.png",
  "Magical resistance": "/img/divinity/talent-icons/talent-06.png",
  "Attack speed": "/img/divinity/talent-icons/talent-07.png",
  "Lifesteal": "/img/divinity/talent-icons/talent-08.png",
  "All basic attributes": "/img/divinity/talent-icons/talent-10.png",
  "Enhance limit": "/img/divinity/talent-icons/talent-11.png",
  "Iconic weapon attributes": "/img/divinity/talent-icons/talent-13.png",
  "Breakthrough": "/img/divinity/talent-icons/talent-14.png",
  "Parry": "/img/divinity/talent-icons/talent-15.png",
  "Crit damage resistance": "/img/divinity/talent-icons/talent-16.png",
  "Crit chance resistance": "/img/divinity/talent-icons/talent-17.png",
  "Control resistance": "/img/divinity/talent-icons/talent-20.png",
  "Luck": "/img/divinity/talent-icons/talent-21.png",
  "Health to all heroes": "/img/divinity/talent-icons/talent-22.png",
  "Def to all heroes": "/img/divinity/talent-icons/talent-23.png",
  "Atk to all heroes": "/img/divinity/talent-icons/talent-24.png",
  "Divinity skill level": "/img/divinity/talent-icons/talent-25.png",
};

describe("divinity catalogs", () => {
  test("level costs cover the exact sequential 1..30 catalog", () => {
    expect(divinityLevels.map(({ level }) => level)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    divinityLevels.forEach(({ segmentCost, segmentCount, transitionCost }) => {
      expect(Number.isSafeInteger(segmentCount)).toBe(true);
      expect(segmentCount).toBeGreaterThan(0);
      [...Object.values(segmentCost), ...Object.values(transitionCost)].forEach(
        (cost) => {
          expect(Number.isSafeInteger(cost)).toBe(true);
          expect(cost).toBeGreaterThanOrEqual(0);
        },
      );
    });
  });

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

  test("every minor node uses its exact original APK talent icon", () => {
    const minorNodes = divinityTreeTemplate.filter(
      (node) => node.nodeType === "minorStat",
    );

    expect(minorNodes).not.toHaveLength(0);
    minorNodes.forEach((node) => {
      expect(node.icon).toBe(EXPECTED_TALENT_ICONS[node.label]);
    });
    expect(new Set(minorNodes.map((node) => node.icon))).toEqual(
      new Set(Object.values(EXPECTED_TALENT_ICONS)),
    );
  });

  test("branch-point connector keeps its exact APK icon and localized effect", () => {
    expect(divinityBranchPointConnector).toEqual({
      label: "Узлы божественной энергии",
      description: "Предел узлов божественной энергии +1",
      meta: "Лимит +1",
      icon: "/img/divinity/talent-icons/talent-12.png",
      source: {
        clientVersion: "1.48.0",
        build: 94,
        asset: "Talent12",
        localizationKey: "GodTalentAttri_description_GOD_Power",
      },
    });
  });
});
