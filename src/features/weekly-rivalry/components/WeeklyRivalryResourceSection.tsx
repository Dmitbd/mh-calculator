import type { WeeklyRivalryEventConfig } from "@/features/game-data/weekly-rivalry";
import { weeklyRivalryResourceCatalog } from "@/features/game-data/weekly-rivalry";

import type { NormalizedWeeklyRivalryInput } from "../model/types";
import { WeeklyRivalryInputs } from "./WeeklyRivalryInputs";
import { WeeklyRivalryToggle } from "./WeeklyRivalryToggle";

type WeeklyRivalryResourceSectionProps = {
  config: WeeklyRivalryEventConfig;
  input: NormalizedWeeklyRivalryInput;
  onChangeSpendResource: (value: string) => void;
  onChangeWeeklyEventChests: (value: string) => void;
  onChangeSharedCashback: (checked: boolean) => void;
};

export function WeeklyRivalryResourceSection({
  config,
  input,
  onChangeSpendResource,
  onChangeWeeklyEventChests,
  onChangeSharedCashback,
}: WeeklyRivalryResourceSectionProps) {
  return (
    <>
      <WeeklyRivalryInputs
        chestResource={
          weeklyRivalryResourceCatalog[config.weeklyEventChestResourceId]
        }
        onChangeSpendResource={onChangeSpendResource}
        onChangeWeeklyEventChests={onChangeWeeklyEventChests}
        spendResource={weeklyRivalryResourceCatalog[config.spendResourceId]}
        spendResourceCount={input.ownedSpendResource}
        spendResourceGenitivePlural={config.spendResourceForms.genitivePlural}
        weeklyEventChests={input.ownedWeeklyEventChests}
      />
      <WeeklyRivalryToggle
        checked={input.includeSharedCashback}
        description="Включённые кешбэки соперничества и заданий учитываются в обеих зонах."
        label="Учитывать общий кешбэк"
        onChange={onChangeSharedCashback}
      />
    </>
  );
}
