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

type AntiqueResourceMetadataBase<Kind extends AntiqueResourceKind> = {
  kind: Kind;
  label: string;
  fallbackLabel: string;
};

export type VerifiedAntiqueResourceMetadata<
  Kind extends AntiqueResourceKind = AntiqueResourceKind,
> = AntiqueResourceMetadataBase<Kind> & {
  verification: "verified";
  resourceId: number;
  spriteName: string;
  icon?: string;
};

export type UnresolvedAntiqueResourceMetadata<
  Kind extends AntiqueResourceKind = AntiqueResourceKind,
> = AntiqueResourceMetadataBase<Kind> & {
  verification: "unresolved";
  resourceId?: never;
  spriteName?: never;
  icon?: string;
};

export type AntiqueResourceMetadata<
  Kind extends AntiqueResourceKind = AntiqueResourceKind,
> =
  | VerifiedAntiqueResourceMetadata<Kind>
  | UnresolvedAntiqueResourceMetadata<Kind>;

export type AntiqueResourceCatalog = {
  [Kind in AntiqueResourceKind]: AntiqueResourceMetadata<Kind>;
};
