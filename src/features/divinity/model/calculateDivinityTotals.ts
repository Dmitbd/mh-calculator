import type { DivinityStep, StoneCosts } from "./types";

type DivinityTotals = {
  currentLevel: number;
  totalCost: StoneCosts;
};

const emptyCosts = (): StoneCosts => ({
  stone5: 0,
  stone6: 0,
  stone7: 0,
});

export function calculateDivinityTotals(
  steps: DivinityStep[],
  currentLevel: number,
): DivinityTotals {
  return steps
    .filter((step) => step.toLevel <= currentLevel)
    .reduce<DivinityTotals>(
      (result, step) => ({
        currentLevel,
        totalCost: {
          stone5: result.totalCost.stone5 + step.totalCost.stone5,
          stone6: result.totalCost.stone6 + step.totalCost.stone6,
          stone7: result.totalCost.stone7 + step.totalCost.stone7,
        },
      }),
      {
        currentLevel,
        totalCost: emptyCosts(),
      },
    );
}
