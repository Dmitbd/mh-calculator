import type {
  WeeklyRivalryQuestSection,
  WeeklyRivalryReward,
  WeeklyRivalryTask,
} from "@/features/game-data/weekly-rivalry";

export type WeeklyRivalryInput = {
  ownedSpendResource: number;
  ownedWeeklyEventChests: number;
  includeRivalryCashback: boolean;
  includeWeeklyEventChestCashback: boolean;
  includeQuestCashback: boolean;
  includeSharedCashback: boolean;
};

export type NormalizedWeeklyRivalryInput = WeeklyRivalryInput;

export type WeeklyRivalryEventProgress = {
  rivalryProgress: RivalryProgress;
  questProgress: QuestProgress;
};

export type AggregatedReward = WeeklyRivalryReward;

export type RivalryProgress = {
  totalScore: number;
  openedNodes: number;
  cashbackRewards: AggregatedReward[];
};

export type QuestTaskProgress = {
  task: WeeklyRivalryTask;
  current: number;
  isComplete: boolean;
};

export type QuestSectionProgress = {
  section: WeeklyRivalryQuestSection;
  tasks: QuestTaskProgress[];
  isComplete: boolean;
};

export type QuestProgress = {
  sections: QuestSectionProgress[];
  cashbackRewards: AggregatedReward[];
};
