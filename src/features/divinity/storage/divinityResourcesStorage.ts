import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createEmptyDivinityOwnedResources,
  normalizeDivinityOwnedResources,
} from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";

const STORAGE_KEY = "divinity-resources";

export type DivinityResourcesRecord = DivinityOwnedResources & {
  updatedAt: string;
};

function defaultRecord(): DivinityResourcesRecord {
  return {
    ...createEmptyDivinityOwnedResources(),
    updatedAt: new Date(0).toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type DivinityResourcesRecordInput = {
  chestCounts?: Record<string, unknown> | null;
  gemCounts?: Record<string, unknown> | null;
  updatedAt?: string | null;
};

function isDivinityResourcesRecordInput(
  value: unknown,
): value is DivinityResourcesRecordInput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.chestCounts == null || isRecord(value.chestCounts)) &&
    (value.gemCounts == null || isRecord(value.gemCounts)) &&
    (value.updatedAt == null || typeof value.updatedAt === "string")
  );
}

export async function loadDivinityResources(): Promise<DivinityResourcesRecord> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultRecord();
  }

  const parsed: unknown = JSON.parse(storedValue);

  if (!isDivinityResourcesRecordInput(parsed)) {
    throw new TypeError("Invalid divinity resources record");
  }
  const normalized = normalizeDivinityOwnedResources({
    chestCounts: parsed.chestCounts,
    gemCounts: parsed.gemCounts,
  });

  return {
    ...normalized,
    updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function saveDivinityResources(
  resources: DivinityOwnedResources,
): Promise<DivinityResourcesRecord> {
  const record: DivinityResourcesRecord = {
    ...normalizeDivinityOwnedResources(resources),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  return record;
}

export async function resetDivinityResources(): Promise<DivinityResourcesRecord> {
  return saveDivinityResources(createEmptyDivinityOwnedResources());
}
