import {
  getAvailableBranchesForColumn,
  getMissingPreviousMajorSkillLevel,
  isBranchSelectionAllowed,
} from "../model/branchTreeRules";

import type {
  DivinityBranch,
  DraftBranchColumns,
  TreeTemplateNode,
} from "@/features/game-data/divinity/types";

const template: TreeTemplateNode[] = [
  { columnId: "center", level: 1, nodeType: "majorSkill", tier: 1 },
  { columnId: "left", level: 3, nodeType: "majorSkill", tier: 1 },
  { columnId: "left", level: 10, nodeType: "majorSkill", tier: 2 },
  { columnId: "left", level: 15, nodeType: "majorSkill", tier: 3 },
  {
    columnId: "left",
    icon: "/minor.png",
    label: "Minor",
    level: 11,
    nodeType: "minorStat",
    statId: "minor",
    unit: "%",
    value: 1,
  },
];

const branches: DivinityBranch[] = [
  { icon: "/asterial.png", id: "asterial", order: 1, title: "Asterial" },
  { icon: "/psyche.png", id: "psyche", order: 2, title: "Psyche" },
  {
    icon: "/immortality.png",
    id: "immortality",
    order: 3,
    title: "Immortality",
  },
];

describe("branchTreeRules", () => {
  describe("getMissingPreviousMajorSkillLevel", () => {
    it("allows a level with no previous major skill", () => {
      expect(
        getMissingPreviousMajorSkillLevel(template, {}, "center", 1),
      ).toBeNull();
    });

    it("returns the first missing previous major skill for ordinary and major levels", () => {
      expect(
        getMissingPreviousMajorSkillLevel(template, {}, "left", 10),
      ).toBe(3);
      expect(
        getMissingPreviousMajorSkillLevel(template, {}, "left", 11),
      ).toBe(3);
      expect(
        getMissingPreviousMajorSkillLevel(
          template,
          { "left:3": "asterial-gemini" },
          "left",
          15,
        ),
      ).toBe(10);
    });

    it("ignores selected skills from other columns", () => {
      expect(
        getMissingPreviousMajorSkillLevel(
          template,
          { "center:1": "asterial-gemini" },
          "left",
          10,
        ),
      ).toBe(3);
    });
  });

  describe("branch uniqueness", () => {
    const selectedBranches: DraftBranchColumns = {
      center: "psyche",
      left: "asterial",
      right: null,
    };

    it("allows the current column branch and rejects branches occupied elsewhere", () => {
      expect(
        isBranchSelectionAllowed(selectedBranches, "left", "asterial"),
      ).toBe(true);
      expect(
        isBranchSelectionAllowed(selectedBranches, "center", "asterial"),
      ).toBe(false);
      expect(
        isBranchSelectionAllowed(selectedBranches, "right", "psyche"),
      ).toBe(false);
      expect(
        isBranchSelectionAllowed(selectedBranches, "right", "immortality"),
      ).toBe(true);
    });

    it("projects the same rule into branch options without mutating inputs", () => {
      const branchesBefore = [...branches];
      const selectedBefore = { ...selectedBranches };

      expect(
        getAvailableBranchesForColumn(branches, selectedBranches, "center").map(
          (branch) => branch.id,
        ),
      ).toEqual(["psyche", "immortality"]);
      expect(branches).toEqual(branchesBefore);
      expect(selectedBranches).toEqual(selectedBefore);
    });
  });
});
