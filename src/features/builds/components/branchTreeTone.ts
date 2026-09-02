import type { BranchColumnId } from "@/features/game-data/divinity/types";
import type { BranchTreeTone } from "@/shared/ui/BranchTreeGrid";

const TONE_BY_COLUMN: Readonly<Record<BranchColumnId, BranchTreeTone>> = {
  left: "blue",
  center: "green",
  right: "purple",
};

export function getBranchTreeToneForColumn(
  columnId: BranchColumnId,
): BranchTreeTone {
  return TONE_BY_COLUMN[columnId];
}
