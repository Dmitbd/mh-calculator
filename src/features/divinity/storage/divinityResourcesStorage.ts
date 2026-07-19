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

export async function loadDivinityResources(): Promise<DivinityResourcesRecord> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultRecord();
  }

  const parsed = JSON.parse(storedValue) as Partial<DivinityResourcesRecord>;
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
