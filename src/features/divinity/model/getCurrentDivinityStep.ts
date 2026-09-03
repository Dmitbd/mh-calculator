import type { DivinityLevel, DivinityProgress } from "./types";

type CurrentDivinityStep = DivinityLevel & {
  filledSegments: number;
  transitionReady: boolean;
};

export function getCurrentDivinityStep(
  levels: readonly DivinityLevel[],
  progress: DivinityProgress,
): CurrentDivinityStep | null {
  if (progress.currentLevel >= progress.endLevel) {
    return null;
  }

  const level = levels.find((entry) => entry.level === progress.currentLevel);

  if (!level) {
    return null;
  }

  return {
    ...level,
    filledSegments: Math.min(progress.filledSegments, level.segmentCount),
    transitionReady: level.segmentCount > 0 && progress.filledSegments >= level.segmentCount,
  };
}
