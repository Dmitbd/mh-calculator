import type {
  WeeklyRivalryEventConfig,
  WeeklyRivalryEventId,
  WeeklyRivalryReward,
} from "./types";
import { WEEKLY_RIVALRY_EVENT_IDS } from "./types";
import {
  RIVALRY_NODE_COUNT,
  RIVALRY_NODE_SCORE_STEP,
  RIVALRY_REWARD_RESOURCE_IDS,
  WEEKLY_EVENT_CHEST_RESOURCE_ID,
  WEEKLY_RIVALRY_QUEST_THRESHOLDS,
  WEEKLY_RIVALRY_REWARDS_PER_SECTION,
  WEEKLY_RIVALRY_REWARDS_PER_TASK,
  WEEKLY_RIVALRY_SECTION_COUNT,
  WEEKLY_RIVALRY_SPEND_RESOURCE_BY_EVENT,
  WEEKLY_RIVALRY_TASK_ID_START_BY_EVENT,
  WEEKLY_RIVALRY_TASKS_PER_SECTION,
} from "./weeklyRivalrySnapshot";

const EVENT_IDS = new Set<WeeklyRivalryEventId>(WEEKLY_RIVALRY_EVENT_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    throw new Error(`weekly rivalry config: invalid ${field}`);
  }
  return value;
}

function requirePositiveSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error(`weekly rivalry config: invalid ${field}`);
  }
  return value as number;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`weekly rivalry config: invalid ${field}`);
  }
  return value;
}

function requireBoundedPositiveInteger(
  value: unknown,
  field: string,
  maximum: number,
) {
  const parsed = requirePositiveSafeInteger(value, field);
  if (parsed > maximum) {
    throw new Error(`weekly rivalry config: ${field} exceeds maximum`);
  }
  return parsed;
}

function requireUnique(values: readonly number[], field: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`weekly rivalry config: duplicate ${field}`);
  }
}

function requireStrictAscending(values: readonly number[], field: string) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] <= values[index - 1]) {
      throw new Error(`weekly rivalry config: unordered ${field}`);
    }
  }
}

function parseReward(
  value: unknown,
  resourceMetadata: Map<number, Pick<WeeklyRivalryReward, "name" | "icon">>,
): WeeklyRivalryReward {
  if (!isRecord(value)) {
    throw new Error("weekly rivalry config: invalid reward");
  }
  const resourceId = requirePositiveSafeInteger(value.resourceId, "resource id");
  const amount = requireBoundedPositiveInteger(
    value.amount,
    "reward amount",
    1_000_000_000,
  );
  const name = requireText(value.name, "reward name");
  const icon = `/img/weekly-rivalry/${resourceId}.png` as const;
  if (value.icon !== icon) {
    throw new Error(`weekly rivalry config: invalid icon for ${resourceId}`);
  }
  const known = resourceMetadata.get(resourceId);
  if (known && (known.name !== name || known.icon !== icon)) {
    throw new Error(`weekly rivalry config: inconsistent resource ${resourceId}`);
  }
  resourceMetadata.set(resourceId, { name, icon });
  return { resourceId, amount, name, icon };
}

export function validateWeeklyRivalryEventConfig(
  value: unknown,
): WeeklyRivalryEventConfig {
  if (!isRecord(value)) {
    throw new Error("weekly rivalry config: invalid root");
  }
  const id = requireText(value.id, "event id");
  if (!EVENT_IDS.has(id as WeeklyRivalryEventId)) {
    throw new Error(`weekly rivalry config: unknown event id ${id}`);
  }
  if (!isRecord(value.spendResourceForms)) {
    throw new Error("weekly rivalry config: invalid resource forms");
  }
  const sourceVersion = requireText(value.sourceVersion, "source version");
  if (sourceVersion !== "1.48.0") {
    throw new Error("weekly rivalry config: unexpected source version");
  }
  if (
    !Array.isArray(value.rivalryNodes) ||
    value.rivalryNodes.length !== RIVALRY_NODE_COUNT
  ) {
    throw new Error("weekly rivalry config: missing rivalry nodes");
  }
  if (
    !Array.isArray(value.questSections) ||
    value.questSections.length !== WEEKLY_RIVALRY_SECTION_COUNT
  ) {
    throw new Error("weekly rivalry config: missing quest sections");
  }

  const resourceMetadata = new Map<
    number,
    Pick<WeeklyRivalryReward, "name" | "icon">
  >();
  const rivalryNodes = value.rivalryNodes.map((nodeValue) => {
    if (!isRecord(nodeValue) || !Array.isArray(nodeValue.rewards)) {
      throw new Error("weekly rivalry config: invalid rivalry node");
    }
    return {
      id: requirePositiveSafeInteger(nodeValue.id, "node id"),
      node: requirePositiveSafeInteger(nodeValue.node, "node number"),
      requiredScore: requirePositiveSafeInteger(
        nodeValue.requiredScore,
        "node threshold",
      ),
      isSpecial: requireBoolean(nodeValue.isSpecial, "special node marker"),
      rewards: nodeValue.rewards.map((reward) =>
        parseReward(reward, resourceMetadata),
      ),
    };
  });

  const taskIds: number[] = [];
  const questSections = value.questSections.map((sectionValue) => {
    if (
      !isRecord(sectionValue) ||
      !Array.isArray(sectionValue.tasks) ||
      !Array.isArray(sectionValue.sectionRewards) ||
      sectionValue.tasks.length !== WEEKLY_RIVALRY_TASKS_PER_SECTION ||
      sectionValue.sectionRewards.length !== WEEKLY_RIVALRY_REWARDS_PER_SECTION
    ) {
      throw new Error("weekly rivalry config: invalid quest section");
    }
    const tasks = sectionValue.tasks.map((taskValue) => {
      if (
        !isRecord(taskValue) ||
        !Array.isArray(taskValue.rewards) ||
        taskValue.rewards.length !== WEEKLY_RIVALRY_REWARDS_PER_TASK
      ) {
        throw new Error("weekly rivalry config: invalid task");
      }
      const task = {
        id: requirePositiveSafeInteger(taskValue.id, "task id"),
        requiredSpend: requirePositiveSafeInteger(
          taskValue.requiredSpend,
          "task threshold",
        ),
        rewards: taskValue.rewards.map((reward) =>
          parseReward(reward, resourceMetadata),
        ),
      };
      taskIds.push(task.id);
      return task;
    });
    return {
      number: requirePositiveSafeInteger(sectionValue.number, "section number"),
      tasks,
      sectionRewards: sectionValue.sectionRewards.map((reward) =>
        parseReward(reward, resourceMetadata),
      ),
    };
  });

  requireUnique(rivalryNodes.map((node) => node.id), "node id");
  requireUnique(rivalryNodes.map((node) => node.node), "node number");
  requireUnique(taskIds, "task id");
  requireUnique(questSections.map((section) => section.number), "section number");
  requireStrictAscending(
    rivalryNodes.map((node) => node.requiredScore),
    "node thresholds",
  );

  rivalryNodes.forEach((node, index) => {
    const expectedNode = index + 1;
    const expectedSpecial = expectedNode % 4 === 0;
    if (
      node.node !== expectedNode ||
      node.id !== 193 + index ||
      node.requiredScore !== expectedNode * RIVALRY_NODE_SCORE_STEP ||
      node.isSpecial !== expectedSpecial
    ) {
      throw new Error("weekly rivalry config: invalid rivalry track shape");
    }
    const expectedRewards = expectedSpecial
      ? [[WEEKLY_EVENT_CHEST_RESOURCE_ID, 10]]
      : RIVALRY_REWARD_RESOURCE_IDS.map((resourceId) => [resourceId, 2]);
    if (
      node.rewards.length !== expectedRewards.length ||
      node.rewards.some(
        (reward, rewardIndex) =>
          reward.resourceId !== expectedRewards[rewardIndex][0] ||
          reward.amount !== expectedRewards[rewardIndex][1],
      )
    ) {
      throw new Error("weekly rivalry config: invalid rivalry rewards");
    }
  });

  const flatTasks = questSections.flatMap((section) => section.tasks);
  if (
    flatTasks.some(
      (task, index) =>
        task.requiredSpend !== WEEKLY_RIVALRY_QUEST_THRESHOLDS[index],
    )
  ) {
    throw new Error("weekly rivalry config: invalid quest thresholds");
  }
  requireStrictAscending(
    questSections.flatMap((section) =>
      section.tasks.map((task) => task.requiredSpend),
    ),
    "task thresholds",
  );

  const maxRivalryScore = requirePositiveSafeInteger(
    value.maxRivalryScore,
    "maximum rivalry score",
  );
  if (rivalryNodes.at(-1)?.requiredScore !== maxRivalryScore) {
    throw new Error("weekly rivalry config: maximum score does not match track");
  }
  const spendResourceId = requirePositiveSafeInteger(
    value.spendResourceId,
    "spend resource id",
  );
  const weeklyEventChestResourceId = requirePositiveSafeInteger(
    value.weeklyEventChestResourceId,
    "weekly chest resource id",
  );
  if (
    spendResourceId !==
      WEEKLY_RIVALRY_SPEND_RESOURCE_BY_EVENT[id as WeeklyRivalryEventId] ||
    weeklyEventChestResourceId !== WEEKLY_EVENT_CHEST_RESOURCE_ID
  ) {
    throw new Error("weekly rivalry config: invalid event resource roles");
  }
  const expectedTaskIdStart =
    WEEKLY_RIVALRY_TASK_ID_START_BY_EVENT[id as WeeklyRivalryEventId];
  if (
    flatTasks.some((task, index) => {
      const sectionIndex = Math.floor(index / WEEKLY_RIVALRY_TASKS_PER_SECTION);
      const taskIndex = index % WEEKLY_RIVALRY_TASKS_PER_SECTION;
      return (
        task.id !==
        expectedTaskIdStart +
          sectionIndex * (WEEKLY_RIVALRY_TASKS_PER_SECTION + 1) +
          taskIndex
      );
    })
  ) {
    throw new Error("weekly rivalry config: invalid task ids");
  }
  if (!resourceMetadata.has(spendResourceId)) {
    throw new Error("weekly rivalry config: spend resource is missing from rewards");
  }
  if (!resourceMetadata.has(weeklyEventChestResourceId)) {
    throw new Error("weekly rivalry config: weekly chest is missing from rewards");
  }

  return {
    sourceVersion,
    id: id as WeeklyRivalryEventId,
    title: requireText(value.title, "title"),
    spendResourceId,
    spendResourceForms: {
      singular: requireText(value.spendResourceForms.singular, "resource singular"),
      singularTitle: requireText(
        value.spendResourceForms.singularTitle,
        "resource singular title",
      ),
      pluralTitle: requireText(
        value.spendResourceForms.pluralTitle,
        "resource plural title",
      ),
      genitivePlural: requireText(
        value.spendResourceForms.genitivePlural,
        "resource genitive plural",
      ),
    },
    weeklyEventChestResourceId,
    pointsPerResource: (() => {
      const points = requireBoundedPositiveInteger(
        value.pointsPerResource,
        "points per resource",
        1_000,
      );
      if (points !== 30) {
        throw new Error("weekly rivalry config: invalid points per resource");
      }
      return points;
    })(),
    maxRivalryScore,
    rivalryNodes,
    questSections,
  };
}
