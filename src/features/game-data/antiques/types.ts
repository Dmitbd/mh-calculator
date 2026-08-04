export type AntiqueRivalryReward = {
  score: number;
  tombMaps: number;
  templeMaps: number;
  legendaryChestFragments: number;
  mythicChestFragments: number;
};

export type AntiqueResourceKind =
  | "researchCoins"
  | "tombMap"
  | "templeMap"
  | "eventChest"
  | "legendaryChestFragments"
  | "mythicChestFragments";

export type AntiqueResourceMetadata = {
  kind: AntiqueResourceKind;
  label: string;
  fallbackLabel: string;
  resourceId?: number;
  spriteName?: string;
  icon?: string;
};
