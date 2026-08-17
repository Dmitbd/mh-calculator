export type SummonRivalryInput = {
  ownedCommonScrolls?: unknown;
  ownedLimitedScrolls?: unknown;
  ownedFactionScrolls?: unknown;
  ownedFateCrystals?: unknown;
  purchasedCommonScrolls?: unknown;
  purchasedLimitedScrolls?: unknown;
  purchasedFateCrystals?: unknown;
  includeCashback?: boolean;
};

export type SummonResourceCounts = {
  commonScrolls: number;
  limitedScrolls: number;
  factionScrolls: number;
  fateCrystals: number;
};

export type SummonPurchaseCounts = Pick<
  SummonResourceCounts,
  "commonScrolls" | "limitedScrolls" | "fateCrystals"
>;

export type SummonCashback = {
  commonScrolls: number;
  fateCrystals: number;
  ssrFragments: number;
  urFragments: number;
};

export type SummonPurchaseCosts = SummonPurchaseCounts & {
  total: number;
};

export type SummonRivalryResult = {
  baseScore: number;
  totalScore: number;
  scoreRemaining: number;
  openedNodes: number;
  openedMajorChests: number;
  spentResources: SummonResourceCounts;
  purchases: SummonPurchaseCounts;
  purchaseCosts: SummonPurchaseCosts;
  diamondCost: number;
  cashback: SummonCashback;
};
