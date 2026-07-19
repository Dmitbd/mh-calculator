import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

export type StoneCosts = {
  stone1: number;
  stone2: number;
  stone3: number;
  stone4: number;
  stone5: number;
  stone6: number;
  stone7: number;
};

export type DivinityLevel = {
  level: number;
  segmentCount: number;
  segmentCost: StoneCosts;
  transitionCost: StoneCosts;
  note?: string;
};

export type DivinityProgress = {
  startLevel: number;
  endLevel: number;
  currentLevel: number;
  filledSegments: number;
};

export type DivinityChestCounts = Record<DivinityGemChestId, number>;

export type DivinityGemCounts = Record<DivinityGemLevel, number>;

export type DivinityOwnedResources = {
  chestCounts: DivinityChestCounts;
  gemCounts: DivinityGemCounts;
};
