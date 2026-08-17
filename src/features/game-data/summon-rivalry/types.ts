export type SummonRivalryReward = {
  score: number;
  commonScrolls: number;
  fateCrystals: number;
  ssrFragments: number;
  urFragments: number;
};

export type SummonRivalryResourceKind =
  | "commonScroll"
  | "factionScroll"
  | "limitedScroll"
  | "fateCrystal"
  | "ssrHeroFragment"
  | "urHeroFragment"
  | "diamond";

export type SummonRivalryResourceMetadata = {
  kind: SummonRivalryResourceKind;
  verification: "verified";
  label: string;
  fallbackLabel: string;
  resourceId: number;
  spriteName: string;
  icon: `/img/${string}`;
};

export type SummonRivalryResourceCatalog = Record<
  SummonRivalryResourceKind,
  SummonRivalryResourceMetadata
>;
