import type { DivinityStep } from "./types";

export function getNextDivinityStep(
  steps: DivinityStep[],
  currentLevel: number,
): DivinityStep | null {
  return steps.find((step) => step.fromLevel === currentLevel) ?? null;
}
