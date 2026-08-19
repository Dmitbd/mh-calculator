import resourceNamesData from "./resources.json";
import type {
  WeeklyRivalryEventConfig,
  WeeklyRivalryReward,
} from "./types";
import { validateWeeklyRivalryEventConfig } from "./validateWeeklyRivalryEventConfig";
import {
  RIVALRY_NODE_COUNT,
  RIVALRY_NODE_SCORE_STEP,
  RIVALRY_REWARD_RESOURCE_IDS,
  WEEKLY_EVENT_CHEST_RESOURCE_ID,
  WEEKLY_RIVALRY_QUEST_THRESHOLDS,
  WEEKLY_RIVALRY_SECTION_COUNT,
  WEEKLY_RIVALRY_TASKS_PER_SECTION,
} from "./weeklyRivalrySnapshot";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function requirePositiveSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error(`weekly rivalry compact data: invalid ${field}`);
  }
  return value as number;
}

function buildResourceNames(value: unknown): ReadonlyMap<number, string> {
  if (!isRecord(value)) {
    throw new Error("weekly rivalry compact data: invalid resources");
  }
  const result = new Map<number, string>();
  for (const [rawId, rawName] of Object.entries(value)) {
    const resourceId = requirePositiveSafeInteger(Number(rawId), "resource id");
    if (typeof rawName !== "string" || rawName.trim() !== rawName || !rawName) {
      throw new Error(`weekly rivalry compact data: invalid resource ${rawId}`);
    }
    result.set(resourceId, rawName);
  }
  return result;
}

const resourceNames = buildResourceNames(resourceNamesData);

function buildReward(value: unknown): WeeklyRivalryReward {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("weekly rivalry compact data: invalid reward tuple");
  }
  const resourceId = requirePositiveSafeInteger(value[0], "reward resource id");
  const amount = requirePositiveSafeInteger(value[1], "reward amount");
  const name = resourceNames.get(resourceId);
  if (!name) {
    throw new Error(`weekly rivalry compact data: unknown resource ${resourceId}`);
  }
  return {
    resourceId,
    amount,
    name,
    icon: `/img/weekly-rivalry/${resourceId}.png`,
  };
}

function buildRewardGroups(
  value: unknown,
  expectedLength: number,
  field: string,
): WeeklyRivalryReward[][] {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`weekly rivalry compact data: invalid ${field}`);
  }
  return value.map((group) => {
    if (!Array.isArray(group)) {
      throw new Error(`weekly rivalry compact data: invalid ${field} group`);
    }
    return group.map(buildReward);
  });
}

export function buildWeeklyRivalryEventConfig(
  value: unknown,
): WeeklyRivalryEventConfig {
  if (!isRecord(value)) {
    throw new Error("weekly rivalry compact data: invalid event");
  }
  const taskIdStart = requirePositiveSafeInteger(value.taskIdStart, "task id start");
  const taskRewards = buildRewardGroups(
    value.taskRewards,
    WEEKLY_RIVALRY_QUEST_THRESHOLDS.length,
    "task rewards",
  );
  const sectionRewards = buildRewardGroups(
    value.sectionRewards,
    WEEKLY_RIVALRY_SECTION_COUNT,
    "section rewards",
  );

  return validateWeeklyRivalryEventConfig({
    sourceVersion: value.sourceVersion,
    id: value.id,
    title: value.title,
    spendResourceId: value.spendResourceId,
    spendResourceForms: value.spendResourceForms,
    weeklyEventChestResourceId: WEEKLY_EVENT_CHEST_RESOURCE_ID,
    pointsPerResource: 30,
    maxRivalryScore: 12_000,
    rivalryNodes: Array.from({ length: RIVALRY_NODE_COUNT }, (_, index) => {
      const node = index + 1;
      const isSpecial = node % 4 === 0;
      return {
        id: 193 + index,
        node,
        requiredScore: node * RIVALRY_NODE_SCORE_STEP,
        isSpecial,
        rewards: isSpecial
          ? [buildReward([WEEKLY_EVENT_CHEST_RESOURCE_ID, 10])]
          : RIVALRY_REWARD_RESOURCE_IDS.map((resourceId) =>
              buildReward([resourceId, 2]),
            ),
      };
    }),
    questSections: Array.from(
      { length: WEEKLY_RIVALRY_SECTION_COUNT },
      (_, sectionIndex) => ({
        number: sectionIndex + 1,
        tasks: Array.from(
          { length: WEEKLY_RIVALRY_TASKS_PER_SECTION },
          (_, taskIndex) => {
          const flatIndex =
            sectionIndex * WEEKLY_RIVALRY_TASKS_PER_SECTION + taskIndex;
          return {
            id:
              taskIdStart +
              sectionIndex * (WEEKLY_RIVALRY_TASKS_PER_SECTION + 1) +
              taskIndex,
            requiredSpend: WEEKLY_RIVALRY_QUEST_THRESHOLDS[flatIndex],
            rewards: taskRewards[flatIndex],
          };
        }),
        sectionRewards: sectionRewards[sectionIndex],
      }),
    ),
  });
}
