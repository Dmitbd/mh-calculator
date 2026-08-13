import {
  formatValidationToastMessage,
  getRelativeValidationErrors,
  getValidationScrollTarget,
} from "../model/validationNavigation";

describe("validationNavigation", () => {
  it("maps full edit errors to the selected leaf and its exact section", () => {
    const errors = [
      { code: "equipment.runeRequired" as const, message: "Нужна руна", path: "pve/campaign.equipment.runeIds" },
      { code: "hero.required" as const, message: "Другой лист", path: "pvp.heroId" },
    ];

    const relative = getRelativeValidationErrors(errors, ["pve", "campaign"]);

    expect(relative).toEqual([
      { code: "equipment.runeRequired", message: "Нужна руна", path: "equipment.runeIds" },
    ]);
    expect(getValidationScrollTarget(relative)).toBe("equipment");
  });

  it("deduplicates the first five toast messages and reports hidden errors", () => {
    const errors = ["1", "1", "2", "3", "4", "5", "6"].map((message) => ({
      code: "hero.required" as const,
      message,
    }));

    expect(formatValidationToastMessage(errors, "fallback")).toBe(
      "1\n2\n3\n4\n5\nИ ещё 1 ошибок.",
    );
  });
});
