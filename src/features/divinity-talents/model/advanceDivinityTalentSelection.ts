import type { DivinityTalentBranchSelection } from "./types";

export function advanceDivinityTalentSelection(
  current: DivinityTalentBranchSelection | null,
  level: number,
  validLevels: readonly number[],
): DivinityTalentBranchSelection | null {
  if (!validLevels.includes(level)) {
    return current;
  }
  if (!current || current.phase === "complete") {
    return { a: level, b: level, phase: "awaitingB" };
  }
  return { a: current.a, b: level, phase: "complete" };
}
