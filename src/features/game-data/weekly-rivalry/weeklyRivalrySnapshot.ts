import type { WeeklyRivalryEventId } from "./types";

export const HAMMER_OF_ASCENSION_RESOURCE_ID = 200019;
export const GLOWING_PEARL_RESOURCE_ID = 200021;
export const BEAST_SEAL_RESOURCE_ID = 200025;
export const WEEKLY_EVENT_CHEST_RESOURCE_ID = 600053;

export const WEEKLY_RIVALRY_SPEND_RESOURCE_BY_EVENT = {
  "tower-of-babel": HAMMER_OF_ASCENSION_RESOURCE_ID,
  "zodiac-map": GLOWING_PEARL_RESOURCE_ID,
  "beastly-echoes": BEAST_SEAL_RESOURCE_ID,
} as const satisfies Record<WeeklyRivalryEventId, number>;

export const WEEKLY_RIVALRY_TASK_ID_START_BY_EVENT = {
  "tower-of-babel": 2,
  "zodiac-map": 37,
  "beastly-echoes": 72,
} as const satisfies Record<WeeklyRivalryEventId, number>;

export const RIVALRY_REWARD_RESOURCE_IDS = [
  HAMMER_OF_ASCENSION_RESOURCE_ID,
  GLOWING_PEARL_RESOURCE_ID,
  BEAST_SEAL_RESOURCE_ID,
] as const;

export const WEEKLY_RIVALRY_QUEST_THRESHOLDS = [
  5, 10, 20, 30, 50, 80,
  90, 110, 130, 160, 190, 240,
  270, 310, 350, 400, 450, 520,
  570, 630, 690, 760, 830, 920,
  990, 1070, 1150, 1240, 1330, 1440,
] as const;

export const RIVALRY_NODE_COUNT = 16;
export const RIVALRY_NODE_SCORE_STEP = 750;
export const WEEKLY_RIVALRY_SECTION_COUNT = 5;
export const WEEKLY_RIVALRY_TASKS_PER_SECTION = 6;
export const WEEKLY_RIVALRY_REWARDS_PER_TASK = 4;
export const WEEKLY_RIVALRY_REWARDS_PER_SECTION = 4;
