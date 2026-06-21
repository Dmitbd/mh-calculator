import {
  branchBuilderBranches,
  branchBuilderColumns,
  branchBuilderValidationCatalog,
  branchBuilderWeaponAwakeningCatalog,
} from "../data/branchBuilderCatalogs";

describe("branchBuilderCatalogs", () => {
  it("provides normalized catalogs for the branch builder screen", () => {
    expect(branchBuilderColumns.map((column) => column.id)).toEqual([
      "left",
      "center",
      "right",
    ]);
    expect(branchBuilderColumns.find((column) => column.id === "center")?.isMain).toBe(
      true,
    );

    expect(branchBuilderBranches.map((branch) => branch.order)).toEqual(
      [...branchBuilderBranches].map((branch) => branch.order).sort((a, b) => a - b),
    );

    expect(branchBuilderWeaponAwakeningCatalog.colors.length).toBeGreaterThan(0);
    expect(branchBuilderWeaponAwakeningCatalog.slots.length).toBeGreaterThan(0);

    expect(branchBuilderValidationCatalog.branches).toBe(branchBuilderBranches);
    expect(branchBuilderValidationCatalog.weaponAwakeningColors).toBe(
      branchBuilderWeaponAwakeningCatalog.colors,
    );
    expect(branchBuilderValidationCatalog.weaponAwakeningSlots).toBe(
      branchBuilderWeaponAwakeningCatalog.slots,
    );
  });
});
