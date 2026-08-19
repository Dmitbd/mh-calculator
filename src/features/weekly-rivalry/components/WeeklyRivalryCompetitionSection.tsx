import {
  getWeeklyRivalryCashbackResources,
  type WeeklyRivalryEventConfig,
  weeklyRivalryResourceCatalog,
} from "@/features/game-data/weekly-rivalry";

import type {
  NormalizedWeeklyRivalryInput,
  RivalryProgress,
} from "../model/types";
import { WeeklyRivalryCashback } from "./WeeklyRivalryCashback";
import { WeeklyRivalryRewardTrack } from "./WeeklyRivalryRewardTrack";
import { WeeklyRivalryScore } from "./WeeklyRivalryScore";
import { WeeklyRivalryToggle } from "./WeeklyRivalryToggle";
import { WeeklyRivalryZoneHeading } from "./WeeklyRivalryZoneHeading";

type WeeklyRivalryCompetitionSectionProps = {
  config: WeeklyRivalryEventConfig;
  input: NormalizedWeeklyRivalryInput;
  progress: RivalryProgress;
  onChangeRivalryCashback: (checked: boolean) => void;
  onChangeChestCashback: (checked: boolean) => void;
};

export function WeeklyRivalryCompetitionSection({
  config,
  input,
  progress,
  onChangeRivalryCashback,
  onChangeChestCashback,
}: WeeklyRivalryCompetitionSectionProps) {
  return (
    <>
      <WeeklyRivalryZoneHeading
        description="Очки и награды шкалы. Связь с заданиями задаёт общий кешбэк."
        title="Соперничество"
      />
      <WeeklyRivalryToggle
        checked={input.includeRivalryCashback}
        description={`${config.spendResourceForms.singularTitle} из наград`}
        label="Учитывать кешбэк соперничества"
        onChange={onChangeRivalryCashback}
      />
      <WeeklyRivalryToggle
        checked={input.includeWeeklyEventChestCashback}
        description={`1 сундук = 1 ${config.spendResourceForms.singular}`}
        icon={weeklyRivalryResourceCatalog[config.weeklyEventChestResourceId]}
        label="Учитывать кешбэк «Персон. сундук еженед. события»"
        onChange={onChangeChestCashback}
      />
      <WeeklyRivalryScore
        maxScore={config.maxRivalryScore}
        totalScore={progress.totalScore}
      />
      <WeeklyRivalryRewardTrack
        nodes={config.rivalryNodes}
        openedNodes={progress.openedNodes}
      />
      <WeeklyRivalryCashback
        resources={getWeeklyRivalryCashbackResources(config)}
        rewards={progress.cashbackRewards}
        title="Кешбэк соперничества"
      />
    </>
  );
}
