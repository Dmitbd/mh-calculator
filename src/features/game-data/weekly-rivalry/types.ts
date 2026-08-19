export type WeeklyRivalryReward = {
  resourceId: number;
  amount: number;
  name: string;
  icon: `/img/weekly-rivalry/${number}.png`;
};

export type WeeklyRivalryNode = {
  id: number;
  node: number;
  requiredScore: number;
  isSpecial: boolean;
  rewards: WeeklyRivalryReward[];
};

export type WeeklyRivalryTask = {
  id: number;
  requiredSpend: number;
  rewards: WeeklyRivalryReward[];
};

export type WeeklyRivalryQuestSection = {
  number: number;
  tasks: WeeklyRivalryTask[];
  sectionRewards: WeeklyRivalryReward[];
};

export const WEEKLY_RIVALRY_EVENT_IDS = [
  "tower-of-babel",
  "zodiac-map",
  "beastly-echoes",
] as const;

export type WeeklyRivalryEventId =
  (typeof WEEKLY_RIVALRY_EVENT_IDS)[number];

export type WeeklyRivalrySpendResourceForms = {
  singular: string;
  singularTitle: string;
  pluralTitle: string;
  genitivePlural: string;
};

export type WeeklyRivalryEventConfig = {
  sourceVersion: string;
  id: WeeklyRivalryEventId;
  title: string;
  spendResourceId: number;
  spendResourceForms: WeeklyRivalrySpendResourceForms;
  weeklyEventChestResourceId: number;
  pointsPerResource: number;
  maxRivalryScore: number;
  rivalryNodes: WeeklyRivalryNode[];
  questSections: WeeklyRivalryQuestSection[];
};
