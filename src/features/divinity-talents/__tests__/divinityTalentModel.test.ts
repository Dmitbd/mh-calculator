import { divinityTalentConfig } from "@/features/game-data/divinity-talents";

import { advanceDivinityTalentSelection } from "../model/advanceDivinityTalentSelection";
import { calculateDivinityTalentResources } from "../model/calculateDivinityTalentResources";
import {
  EMPTY_DIVINITY_TALENT_SELECTIONS,
  type DivinityTalentRequiredResources,
  type DivinityTalentSelections,
} from "../model/types";

const emptySelections = (): DivinityTalentSelections => ({
  left: null,
  center: null,
  right: null,
});

describe("divinity talent range selection", () => {
  test("starts an awaiting range with A and B on the first valid node", () => {
    expect(advanceDivinityTalentSelection(null, 3, [3, 4, 5])).toEqual({
      a: 3,
      b: 3,
      phase: "awaitingB",
    });
  });

  test("completes the current range on the second valid node", () => {
    expect(
      advanceDivinityTalentSelection(
        { a: 3, b: 3, phase: "awaitingB" },
        5,
        [3, 4, 5],
      ),
    ).toEqual({
      a: 3,
      b: 5,
      phase: "complete",
    });
  });

  test("completes a one-node range when A is clicked again", () => {
    expect(
      advanceDivinityTalentSelection(
        { a: 3, b: 3, phase: "awaitingB" },
        3,
        [3, 4, 5],
      ),
    ).toEqual({
      a: 3,
      b: 3,
      phase: "complete",
    });
  });

  test("starts a replacement range after a completed range", () => {
    expect(
      advanceDivinityTalentSelection(
        { a: 3, b: 5, phase: "complete" },
        4,
        [3, 4, 5],
      ),
    ).toEqual({
      a: 4,
      b: 4,
      phase: "awaitingB",
    });
  });

  test("ignores a level that is not a node in the branch", () => {
    expect(advanceDivinityTalentSelection(null, 6, [3, 4, 5])).toBeNull();
  });

  test("preserves a current selection when the level is not a branch node", () => {
    const current = { a: 3, b: 5, phase: "complete" } as const;

    expect(advanceDivinityTalentSelection(current, 6, [3, 4, 5])).toBe(
      current,
    );
  });
});

describe("divinity talent resource calculation", () => {
  test("returns zero resources when no branch has a selection", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, emptySelections()),
    ).toEqual({
      selectedNodeCount: 0,
      faith: 0,
      inheritedDivinity: 0,
      resonanceStone: 0,
    });
  });

  test("counts A equal to B as one purchased node", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        left: { a: 3, b: 3, phase: "awaitingB" },
      }),
    ).toEqual({
      selectedNodeCount: 1,
      faith: 150,
      inheritedDivinity: 2,
      resonanceStone: 0,
    });
  });

  test("calculates A equal to B identically in awaiting and complete phases", () => {
    const exactSingleNodeCost = {
      selectedNodeCount: 1,
      faith: 150,
      inheritedDivinity: 2,
      resonanceStone: 0,
    };

    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        left: { a: 3, b: 3, phase: "awaitingB" },
      }),
    ).toEqual(exactSingleNodeCost);
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        left: { a: 3, b: 3, phase: "complete" },
      }),
    ).toEqual(exactSingleNodeCost);
  });

  test("normalizes reversed A and B for an inclusive calculation", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        center: { a: 8, b: 4, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 4,
      faith: 1_400,
      inheritedDivinity: 0,
      resonanceStone: 0,
    });
  });

  test("counts only existing side-branch nodes inside an inclusive range", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        left: { a: 3, b: 10, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 6,
      faith: 2_200,
      inheritedDivinity: 9,
      resonanceStone: 0,
    });
  });

  test("aggregates three branch selections without coupling their ranges", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        left: { a: 3, b: 3, phase: "complete" },
        center: { a: 1, b: 1, phase: "awaitingB" },
        right: { a: 4, b: 4, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 3,
      faith: 350,
      inheritedDivinity: 3,
      resonanceStone: 0,
    });
  });

  test("matches the exact full-center branch totals", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        center: { a: 1, b: 30, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 28,
      faith: 52_150,
      inheritedDivinity: 0,
      resonanceStone: 200,
    });
  });

  test("matches the exact full-left branch totals", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        left: { a: 3, b: 30, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 24,
      faith: 49_450,
      inheritedDivinity: 29,
      resonanceStone: 880,
    });
  });

  test("matches the exact full-right branch totals", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        ...emptySelections(),
        right: { a: 3, b: 30, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 24,
      faith: 49_450,
      inheritedDivinity: 29,
      resonanceStone: 880,
    });
  });

  test("matches the exact full-tree totals for all 76 existing nodes", () => {
    expect(
      calculateDivinityTalentResources(divinityTalentConfig, {
        left: { a: 3, b: 30, phase: "complete" },
        center: { a: 1, b: 30, phase: "complete" },
        right: { a: 3, b: 30, phase: "complete" },
      }),
    ).toEqual({
      selectedNodeCount: 76,
      faith: 151_050,
      inheritedDivinity: 58,
      resonanceStone: 1_960,
    });
  });
});

describe("divinity talent selection contracts", () => {
  test("exposes required resource totals as a readonly contract", () => {
    const resources: DivinityTalentRequiredResources =
      calculateDivinityTalentResources(
        divinityTalentConfig,
        emptySelections(),
      );

    if (false) {
      // @ts-expect-error Required resource results are readonly for consumers.
      resources.selectedNodeCount = 1;
    }

    expect(resources.selectedNodeCount).toBe(0);
  });

  test("keeps the exported empty selections immutable at runtime", () => {
    expect(Object.isFrozen(EMPTY_DIVINITY_TALENT_SELECTIONS)).toBe(true);
    expect(
      Reflect.set(EMPTY_DIVINITY_TALENT_SELECTIONS, "left", {
        a: 3,
        b: 3,
        phase: "awaitingB",
      }),
    ).toBe(false);
    expect(EMPTY_DIVINITY_TALENT_SELECTIONS.left).toBeNull();
  });
});
