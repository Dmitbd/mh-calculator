export type AntiqueRivalryInput = {
  coins: unknown;
  templeMapAllocation: unknown;
  ownedTombMaps: unknown;
  ownedTempleMaps: unknown;
};

export type AntiqueCoinAllocation = {
  spendableCoins: number;
  unusedCoins: number;
  tombMaps: number;
  templeMaps: number;
  templeMapAllocation: number;
};

export type AntiqueMapCounts = {
  tombMaps: number;
  templeMaps: number;
};

export type AntiqueCashback = AntiqueMapCounts & {
  legendaryChestFragments: number;
  mythicChestFragments: number;
};

export type AntiqueRivalryResult = {
  baseScore: number;
  totalScore: number;
  scoreRemaining: number;
  openedNodes: number;
  openedMajorChests: number;
  allocation: AntiqueCoinAllocation;
  cashback: AntiqueCashback;
  spentMaps: AntiqueMapCounts;
};
