import AsyncStorage from "@react-native-async-storage/async-storage";

import type { WeeklyRivalryEventId } from "@/features/game-data/weekly-rivalry";

import {
  isNormalizedWeeklyRivalryInput,
  normalizeWeeklyRivalryInput,
} from "../model/normalizeWeeklyRivalryInput";
import type {
  NormalizedWeeklyRivalryInput,
} from "../model/types";

const EMPTY_UPDATED_AT = new Date(0).toISOString();

export function getWeeklyRivalryStorageKey(eventId: WeeklyRivalryEventId) {
  return `weekly-rivalry:${eventId}:v1`;
}

type WeeklyRivalryCalculatorRecord = NormalizedWeeklyRivalryInput & {
  schemaVersion: 1;
  updatedAt: string;
};

export function createEmptyWeeklyRivalryInput(): NormalizedWeeklyRivalryInput {
  return normalizeWeeklyRivalryInput({});
}

function defaultRecord(): WeeklyRivalryCalculatorRecord {
  return {
    schemaVersion: 1,
    ...createEmptyWeeklyRivalryInput(),
    updatedAt: EMPTY_UPDATED_AT,
  };
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export async function loadWeeklyRivalryCalculator(
  eventId: WeeklyRivalryEventId,
): Promise<WeeklyRivalryCalculatorRecord> {
  try {
    const storedValue = await AsyncStorage.getItem(
      getWeeklyRivalryStorageKey(eventId),
    );
    if (!storedValue) {
      return defaultRecord();
    }

    const parsed = JSON.parse(storedValue) as unknown;
    if (!isRecord(parsed)) {
      return defaultRecord();
    }

    const updatedAt = parsed.updatedAt;
    if (
      parsed.schemaVersion !== 1 ||
      !isNormalizedWeeklyRivalryInput(parsed) ||
      !isCanonicalIsoTimestamp(updatedAt)
    ) {
      return defaultRecord();
    }
    return {
      schemaVersion: 1,
      ...normalizeWeeklyRivalryInput(parsed),
      updatedAt,
    };
  } catch {
    return defaultRecord();
  }
}

export async function saveWeeklyRivalryCalculator(
  eventId: WeeklyRivalryEventId,
  input: unknown,
): Promise<WeeklyRivalryCalculatorRecord> {
  const record: WeeklyRivalryCalculatorRecord = {
    schemaVersion: 1,
    ...normalizeWeeklyRivalryInput(input),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    getWeeklyRivalryStorageKey(eventId),
    JSON.stringify(record),
  );
  return record;
}

export async function resetWeeklyRivalryCalculator(
  eventId: WeeklyRivalryEventId,
): Promise<WeeklyRivalryCalculatorRecord> {
  return saveWeeklyRivalryCalculator(eventId, createEmptyWeeklyRivalryInput());
}
