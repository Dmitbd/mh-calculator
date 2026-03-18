export type StoneCosts = {
  stone1: number;
  stone2: number;
  stone3: number;
  stone4: number;
  stone5: number;
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
