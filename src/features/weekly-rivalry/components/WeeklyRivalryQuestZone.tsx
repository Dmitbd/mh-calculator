import {
  getWeeklyQuestCashbackResources,
  type WeeklyRivalryEventConfig,
} from "@/features/game-data/weekly-rivalry";

import type {
  NormalizedWeeklyRivalryInput,
  QuestProgress,
} from "../model/types";
import { WeeklyQuestSection } from "./WeeklyQuestSection";
import { WeeklyRivalryCashback } from "./WeeklyRivalryCashback";
import { WeeklyRivalryToggle } from "./WeeklyRivalryToggle";
import { WeeklyRivalryZoneHeading } from "./WeeklyRivalryZoneHeading";

type WeeklyRivalryQuestZoneProps = {
  config: WeeklyRivalryEventConfig;
  input: NormalizedWeeklyRivalryInput;
  progress: QuestProgress;
  onChangeQuestCashback: (checked: boolean) => void;
};

export function WeeklyRivalryQuestZone({
  config,
  input,
  progress,
  onChangeQuestCashback,
}: WeeklyRivalryQuestZoneProps) {
  return (
    <>
      <WeeklyRivalryZoneHeading
        description={`1 ${config.spendResourceForms.singular} или 1 сундук дают одно очко. Связь с соперничеством задаёт общий кешбэк.`}
        title="Задания события"
      />
      <WeeklyRivalryToggle
        checked={input.includeQuestCashback}
        description={`${config.spendResourceForms.singularTitle} из наград`}
        label="Учитывать кешбэк заданий"
        onChange={onChangeQuestCashback}
      />
      {progress.sections.map((section) => (
        <WeeklyQuestSection
          key={section.section.number}
          progress={section}
          spendResourceGenitivePlural={
            config.spendResourceForms.genitivePlural
          }
        />
      ))}
      <WeeklyRivalryCashback
        resources={getWeeklyQuestCashbackResources(config)}
        rewards={progress.cashbackRewards}
        title="Кешбэк заданий"
      />
    </>
  );
}
