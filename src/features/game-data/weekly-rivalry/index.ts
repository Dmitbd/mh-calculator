import beastlyEchoesData from "./beastly-echoes.json";
import { buildWeeklyRivalryEventConfig } from "./buildWeeklyRivalryEventConfig";
import towerOfBabelData from "./tower-of-babel.json";
import type {
  WeeklyRivalryEventConfig,
  WeeklyRivalryEventId,
  WeeklyRivalryQuestSection,
  WeeklyRivalryReward,
} from "./types";
import { WEEKLY_RIVALRY_EVENT_IDS } from "./types";
import zodiacMapData from "./zodiac-map.json";
import { validateWeeklyRivalryEventConfig } from "./validateWeeklyRivalryEventConfig";
export {
  BEAST_SEAL_RESOURCE_ID,
  GLOWING_PEARL_RESOURCE_ID,
  HAMMER_OF_ASCENSION_RESOURCE_ID,
  WEEKLY_EVENT_CHEST_RESOURCE_ID,
} from "./weeklyRivalrySnapshot";

export const towerOfBabelConfig =
  buildWeeklyRivalryEventConfig(towerOfBabelData);
export const zodiacMapConfig = buildWeeklyRivalryEventConfig(zodiacMapData);
export const beastlyEchoesConfig =
  buildWeeklyRivalryEventConfig(beastlyEchoesData);

export const weeklyRivalryEventConfigById = Object.freeze({
  "tower-of-babel": towerOfBabelConfig,
  "zodiac-map": zodiacMapConfig,
  "beastly-echoes": beastlyEchoesConfig,
} satisfies Record<WeeklyRivalryEventId, WeeklyRivalryEventConfig>);

export const weeklyRivalryEventConfigs = Object.freeze(
  WEEKLY_RIVALRY_EVENT_IDS.map((id) => weeklyRivalryEventConfigById[id]),
);

function allQuestRewards(
  sections: readonly WeeklyRivalryQuestSection[],
): WeeklyRivalryReward[] {
  return sections.flatMap((section) => [
    ...section.tasks.flatMap((task) => task.rewards),
    ...section.sectionRewards,
  ]);
}

function uniqueResources(
  rewards: readonly WeeklyRivalryReward[],
): WeeklyRivalryReward[] {
  const unique = new Map<number, WeeklyRivalryReward>();
  for (const reward of rewards) {
    if (!unique.has(reward.resourceId)) {
      unique.set(reward.resourceId, reward);
    }
  }
  return [...unique.values()];
}

export function getWeeklyRivalryCashbackResources(
  config: WeeklyRivalryEventConfig,
) {
  return uniqueResources(
    config.rivalryNodes.flatMap((node) => node.rewards),
  );
}

export function getWeeklyQuestCashbackResources(
  config: WeeklyRivalryEventConfig,
) {
  return uniqueResources(allQuestRewards(config.questSections));
}

const resourceMap = new Map<number, WeeklyRivalryReward>();
for (const config of weeklyRivalryEventConfigs) {
  for (const reward of [
    ...config.rivalryNodes.flatMap((node) => node.rewards),
    ...allQuestRewards(config.questSections),
  ]) {
    const known = resourceMap.get(reward.resourceId);
    if (known && (known.name !== reward.name || known.icon !== reward.icon)) {
      throw new Error(
        `weekly rivalry config: inconsistent resource ${reward.resourceId}`,
      );
    }
    resourceMap.set(reward.resourceId, reward);
  }
}

export const weeklyRivalryResourceCatalog = Object.freeze(
  Object.fromEntries(resourceMap),
) as Readonly<Record<number, WeeklyRivalryReward>>;

export { validateWeeklyRivalryEventConfig };
export type {
  WeeklyRivalryEventConfig,
  WeeklyRivalryEventId,
  WeeklyRivalryNode,
  WeeklyRivalryQuestSection,
  WeeklyRivalryReward,
  WeeklyRivalrySpendResourceForms,
  WeeklyRivalryTask,
} from "./types";
export { WEEKLY_RIVALRY_EVENT_IDS } from "./types";
