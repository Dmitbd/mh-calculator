import {
  createEmptyEditableBuildDraft,
  reduceEditableBuildDraft,
} from "../model/builderEditorReducer";

describe("builderEditorReducer", () => {
  it("clears column-owned skills, progress and divinity loadout when the branch changes", () => {
    const draft = {
      ...createEmptyEditableBuildDraft(),
      selectedBranches: { left: "asterial" as const, center: null, right: null },
      selectedMajorSkills: {
        "left:3": "asterial-gemini",
        "right:3": "immortality-savvy",
      },
      selectedDivinitySkills: {
        base: ["asterial-gemini"],
        awakened: ["immortality-savvy"],
        awakenedEnabled: true,
      },
      progressLevels: { left: 10, right: 3 },
    };

    const result = reduceEditableBuildDraft(draft, {
      type: "set-column-branch",
      columnId: "left",
      branchId: "psyche",
    });

    expect(result).toMatchObject({
      selectedBranches: { left: "psyche", center: null, right: null },
      selectedMajorSkills: { "right:3": "immortality-savvy" },
      selectedDivinitySkills: { base: [], awakened: [], awakenedEnabled: false },
      progressLevels: { right: 3 },
    });
    expect(result.weaponAwakeningSelections).toEqual(
      draft.weaponAwakeningSelections,
    );
    expect(result.selectedArtifactIds).toEqual(draft.selectedArtifactIds);
    expect(result.selectedRuneIds).toEqual(draft.selectedRuneIds);
  });

  it("rejects a branch already selected by another column", () => {
    const draft = {
      ...createEmptyEditableBuildDraft(),
      selectedBranches: { left: "asterial" as const, center: null, right: null },
    };

    const result = reduceEditableBuildDraft(draft, {
      type: "set-column-branch",
      columnId: "center",
      branchId: "asterial",
    });

    expect(result).toBe(draft);
  });

  it("keeps the same draft instance when the branch does not change", () => {
    const draft = {
      ...createEmptyEditableBuildDraft(),
      selectedBranches: { left: "asterial" as const, center: null, right: null },
      selectedDivinitySkills: {
        base: ["asterial-gemini"],
        awakened: ["asterial-precision"],
        awakenedEnabled: true,
      },
    };

    expect(
      reduceEditableBuildDraft(draft, {
        type: "set-column-branch",
        columnId: "left",
        branchId: "asterial",
      }),
    ).toBe(draft);
  });
});
