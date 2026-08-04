import rewardsData from "./antique-rivalry-rewards.json";
import type { AntiqueRivalryReward } from "./types";

export const ANTIQUE_NODE_STEP = 750;
export const ANTIQUE_EVENT_MAX_SCORE = 12_000;
export const ANTIQUE_MAJOR_THRESHOLDS = [3000, 6000, 9000, 12_000];

export const antiqueRivalryRewards = rewardsData as AntiqueRivalryReward[];

export type { AntiqueRivalryReward } from "./types";
