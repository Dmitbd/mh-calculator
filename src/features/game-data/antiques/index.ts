import rewardsData from "./antique-rivalry-rewards.json";
import type {
  AntiqueResourceCatalog,
  AntiqueRivalryReward,
} from "./types";

export const ANTIQUE_NODE_STEP = 750;
export const ANTIQUE_EVENT_MAX_SCORE = 12_000;
export const ANTIQUE_MAJOR_THRESHOLDS = [3000, 6000, 9000, 12_000];

export const antiqueRivalryRewards = rewardsData as AntiqueRivalryReward[];

/**
 * Resource IDs and sprite names are taken from the v1.48.0 client config.
 * `icon` remains unset until the matching Unity sprite is exported and verified.
 */
export const antiqueResourceCatalog = {
  researchCoins: {
    kind: "researchCoins",
    verification: "unresolved",
    label: "Монеты исследования",
    fallbackLabel: "МИ",
  },
  tombMap: {
    kind: "tombMap",
    verification: "verified",
    label: "Карта гробницы",
    fallbackLabel: "КГ",
    resourceId: 700042,
    spriteName: "700042",
  },
  templeMap: {
    kind: "templeMap",
    verification: "verified",
    label: "Карта храма",
    fallbackLabel: "КХ",
    resourceId: 700043,
    spriteName: "700043",
  },
  eventChest: {
    kind: "eventChest",
    verification: "unresolved",
    label: "Сундук соперничества",
    fallbackLabel: "С",
  },
  legendaryChestFragments: {
    kind: "legendaryChestFragments",
    verification: "verified",
    label: "Фрагменты легендарного сундука антиквариата",
    fallbackLabel: "ФЛ",
    resourceId: 700036,
    spriteName: "700036",
  },
  mythicChestFragments: {
    kind: "mythicChestFragments",
    verification: "verified",
    label: "Фрагменты мифического сундука антиквариата",
    fallbackLabel: "ФМ",
    resourceId: 700035,
    spriteName: "700035",
  },
} satisfies AntiqueResourceCatalog;

export type {
  AntiqueResourceCatalog,
  AntiqueResourceKind,
  AntiqueResourceMetadata,
  AntiqueRivalryReward,
  UnresolvedAntiqueResourceMetadata,
  VerifiedAntiqueResourceMetadata,
} from "./types";
