import {
  createEmptyEditableBuildDraft,
  reduceEditableBuildDraft,
} from "../model/builderEditorReducer";

describe("builderEditorReducer", () => {
  it("clears column-owned skills, progress and divinity loadout when the branch changes", () => {
    const draft = {
      ...createEmptyEditableBuildDraft(),
      selectedBranches: { left: "asterial" as const, center: null, right: null },
      selectedMajorSkills: { "left:3": "asterial-gemini", "right:3": "immortality-savvy" },
      selectedDivinitySkills: {
        base: ["asterial-gemini"],
        awakened: [],
        awakenedEnabled: true,
      },
      progressLevels: { left: 10, right: 3 },
    };

    expect(
      reduceEditableBuildDraft(draft, {
        type: "set-column-branch",
        columnId: "left",
        branchId: "psyche",
      }),
    ).toMatchObject({
      selectedBranches: { left: "psyche", center: null, right: null },
      selectedMajorSkills: { "right:3": "immortality-savvy" },
      selectedDivinitySkills: { base: [], awakened: [], awakenedEnabled: false },
      progressLevels: { right: 3 },
    });
  });

  it("rejects a branch already selected by another column", () => {
    const draft = {
      ...createEmptyEditableBuildDraft(),
      selectedBranches: { left: "asterial" as const, center: null, right: null },
    };

    expect(
      reduceEditableBuildDraft(draft, {
        type: "set-column-branch",
        columnId: "center",
        branchId: "asterial",
      }),
    ).toEqual(draft);
  });
});
