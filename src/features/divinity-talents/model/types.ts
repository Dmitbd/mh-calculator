import type {
  DivinityTalentBranchId,
  DivinityTalentNodeCost,
} from "@/features/game-data/divinity-talents";

export type DivinityTalentSelectionPhase = "awaitingB" | "complete";

export type DivinityTalentBranchSelection = {
  readonly a: number;
  readonly b: number;
  readonly phase: DivinityTalentSelectionPhase;
};

export type DivinityTalentSelections = Readonly<
  Record<DivinityTalentBranchId, DivinityTalentBranchSelection | null>
>;

export type DivinityTalentRequiredResources = Readonly<
  DivinityTalentNodeCost & {
    selectedNodeCount: number;
  }
>;

export const EMPTY_DIVINITY_TALENT_SELECTIONS: DivinityTalentSelections =
  Object.freeze({
    left: null,
    center: null,
    right: null,
  });
