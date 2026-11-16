import type { DivinityBranchId } from "@/features/game-data/divinity/types";
import type { BranchTreeTone } from "@/shared/ui/BranchTreeGrid";

const TONE_BY_BRANCH = {
  asterial: "blue",
  psyche: "green",
  immortality: "yellow",
  devoid: "purple",
  primeval: "red",
} as const satisfies Readonly<Record<DivinityBranchId, BranchTreeTone>>;

export function getBranchTreeToneForBranch(
  branchId: DivinityBranchId | null,
): BranchTreeTone {
  return branchId === null ? "neutral" : TONE_BY_BRANCH[branchId];
}
