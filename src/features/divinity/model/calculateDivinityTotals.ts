import type { DivinityLevel, DivinityProgress, StoneCosts } from "./types";

type DivinityTotals = {
  startLevel: number;
  endLevel: number;
  currentLevel: number;
  filledSegments: number;
  totalCost: StoneCosts;
};

const emptyCosts = (): StoneCosts => ({
  stone1: 0,
  stone2: 0,
  stone3: 0,
  stone4: 0,
  stone5: 0,
});

const addCosts = (left: StoneCosts, right: StoneCosts): StoneCosts => ({
  stone1: left.stone1 + right.stone1,
  stone2: left.stone2 + right.stone2,
  stone3: left.stone3 + right.stone3,
  stone4: left.stone4 + right.stone4,
  stone5: left.stone5 + right.stone5,
});

const multiplyCosts = (costs: StoneCosts, count: number): StoneCosts => ({
  stone1: costs.stone1 * count,
  stone2: costs.stone2 * count,
  stone3: costs.stone3 * count,
  stone4: costs.stone4 * count,
  stone5: costs.stone5 * count,
});

export function calculateDivinityTotals(
  levels: DivinityLevel[],
  progress: DivinityProgress,
): DivinityTotals {
  const completedLevels = levels.filter(
    (level) => level.level >= progress.startLevel && level.level < progress.currentLevel,
  );
  const currentTargetLevel =
    levels.find((level) => level.level === progress.currentLevel) ?? null;

  const fullCompletedCost = completedLevels.reduce(
    (result, level) =>
      addCosts(
        result,
        addCosts(
          multiplyCosts(level.segmentCost, level.segmentCount),
          level.transitionCost,
        ),
      ),
    emptyCosts(),
  );

  const partialCost = currentTargetLevel
    ? multiplyCosts(
        currentTargetLevel.segmentCost,
        Math.min(progress.filledSegments, currentTargetLevel.segmentCount),
      )
    : emptyCosts();

  return {
    startLevel: progress.startLevel,
    endLevel: progress.endLevel,
    currentLevel: progress.currentLevel,
    filledSegments: progress.filledSegments,
    totalCost: addCosts(fullCompletedCost, partialCost),
  };
}
