import type { NormalizedWeeklyRivalryInput } from "./types";

const MAX_WEEKLY_RIVALRY_RESOURCE_COUNT = 1_000_000_000;

function normalizeWeeklyRivalryCount(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(Math.floor(parsed), MAX_WEEKLY_RIVALRY_RESOURCE_COUNT);
}

export function normalizeWeeklyRivalryInput(
  value: unknown,
): NormalizedWeeklyRivalryInput {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    ownedSpendResource: normalizeWeeklyRivalryCount(input.ownedSpendResource),
    ownedWeeklyEventChests: normalizeWeeklyRivalryCount(
      input.ownedWeeklyEventChests,
    ),
    includeRivalryCashback: input.includeRivalryCashback === true,
    includeWeeklyEventChestCashback:
      input.includeWeeklyEventChestCashback === true,
    includeQuestCashback: input.includeQuestCashback === true,
    includeSharedCashback: input.includeSharedCashback === true,
  };
}

export function isNormalizedWeeklyRivalryInput(
  value: unknown,
): value is NormalizedWeeklyRivalryInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const input = value as Record<string, unknown>;
  const isStoredCount = (count: unknown) =>
    typeof count === "number" &&
    Number.isInteger(count) &&
    count >= 0 &&
    count <= MAX_WEEKLY_RIVALRY_RESOURCE_COUNT;

  return (
    isStoredCount(input.ownedSpendResource) &&
    isStoredCount(input.ownedWeeklyEventChests) &&
    typeof input.includeRivalryCashback === "boolean" &&
    typeof input.includeWeeklyEventChestCashback === "boolean" &&
    typeof input.includeQuestCashback === "boolean" &&
    typeof input.includeSharedCashback === "boolean"
  );
}
