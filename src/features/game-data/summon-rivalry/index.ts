import rewardsData from "./summon-rivalry-rewards.json";
import type {
  SummonRivalryResourceCatalog,
  SummonRivalryReward,
} from "./types";

export const SUMMON_RIVALRY_NODE_STEP = 750;
export const SUMMON_RIVALRY_MAX_SCORE = 12_000;
export const SUMMON_RIVALRY_MAJOR_THRESHOLDS = [
  3_000,
  6_000,
  9_000,
  12_000,
];

export const summonRivalryRewards = rewardsData as SummonRivalryReward[];

export const summonRivalryResourceCatalog = {
  commonScroll: {
    kind: "commonScroll",
    verification: "verified",
    label: "Свиток обычного призыва",
    fallbackLabel: "ОП",
    resourceId: 700008,
    spriteName: "Item_700008",
    icon: "/img/summon-rivalry/common-summon-scroll.png",
  },
  factionScroll: {
    kind: "factionScroll",
    verification: "verified",
    label: "Свиток призыва фракции",
    fallbackLabel: "ПФ",
    resourceId: 700009,
    spriteName: "Item_700009",
    icon: "/img/summon-rivalry/faction-summon-scroll.png",
  },
  limitedScroll: {
    kind: "limitedScroll",
    verification: "verified",
    label: "Свиток ограниченного призыва",
    fallbackLabel: "ОГ",
    resourceId: 700010,
    spriteName: "Item_700010",
    icon: "/img/summon-rivalry/limited-summon-scroll.png",
  },
  fateCrystal: {
    kind: "fateCrystal",
    verification: "verified",
    label: "Кристалл судьбы",
    fallbackLabel: "КС",
    resourceId: 700011,
    spriteName: "Item_700011",
    icon: "/img/summon-rivalry/fate-crystal.png",
  },
  ssrHeroFragment: {
    kind: "ssrHeroFragment",
    verification: "verified",
    label: "Осколок SSR героя",
    fallbackLabel: "SSR",
    resourceId: 400002,
    spriteName: "Item_400002",
    icon: "/img/summon-rivalry/ssr-hero-fragment.png",
  },
  urHeroFragment: {
    kind: "urHeroFragment",
    verification: "verified",
    label: "Осколок UR героя",
    fallbackLabel: "UR",
    resourceId: 400003,
    spriteName: "Item_400003",
    icon: "/img/summon-rivalry/ur-hero-fragment.png",
  },
  diamond: {
    kind: "diamond",
    verification: "verified",
    label: "Алмазы",
    fallbackLabel: "А",
    resourceId: 100001,
    spriteName: "Item_100001",
    icon: "/img/summon-rivalry/diamond.png",
  },
} satisfies SummonRivalryResourceCatalog;

export type {
  SummonRivalryResourceCatalog,
  SummonRivalryResourceKind,
  SummonRivalryResourceMetadata,
  SummonRivalryReward,
} from "./types";
