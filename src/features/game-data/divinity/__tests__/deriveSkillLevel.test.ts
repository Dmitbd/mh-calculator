import { deriveSkillLevel } from "../deriveSkillLevel";

describe("deriveSkillLevel", () => {
  it("returns 1 when column progress is undefined", () => {
    expect(deriveSkillLevel(undefined)).toBe(1);
  });

  it("returns 1 when progress is below first upgrade node", () => {
    expect(deriveSkillLevel(19)).toBe(1);
  });

  it("adds +1 for each divinity skill level node reached", () => {
    expect(deriveSkillLevel(20)).toBe(2);
    expect(deriveSkillLevel(24)).toBe(3);
    expect(deriveSkillLevel(28)).toBe(4);
    expect(deriveSkillLevel(30)).toBe(4);
  });
});
