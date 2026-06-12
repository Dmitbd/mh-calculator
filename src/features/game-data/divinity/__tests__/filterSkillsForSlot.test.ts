import skills from "../divinity-skills.json";
import { filterSkillsForSlot } from "../filterSkillsForSlot";
import type { DivinityMajorSkill } from "../types";

const catalog = skills as DivinityMajorSkill[];

describe("filterSkillsForSlot", () => {
  it("returns only skills matching branch and tier", () => {
    const result = filterSkillsForSlot(catalog, "asterial", 1);

    expect(result.length).toBe(4);
    expect(result.every((skill) => skill.branchId === "asterial")).toBe(true);
    expect(result.every((skill) => skill.tier === 1)).toBe(true);
  });

  it("returns empty list for unknown branch", () => {
    expect(
      filterSkillsForSlot(catalog, "unknown" as "asterial", 1),
    ).toEqual([]);
  });
});
