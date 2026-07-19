import AsyncStorage from "@react-native-async-storage/async-storage";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
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
  const defaults = createEmptyDivinityOwnedResources();

  return {
    chestCounts: {
      ...defaults.chestCounts,
      ...parsed.chestCounts,
    },
    gemCounts: {
      ...defaults.gemCounts,
      ...parsed.gemCounts,
    },
    updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function saveDivinityResources(
  resources: DivinityOwnedResources,
): Promise<DivinityResourcesRecord> {
  const record: DivinityResourcesRecord = {
    chestCounts: { ...resources.chestCounts },
    gemCounts: { ...resources.gemCounts },
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  return record;
}

export async function resetDivinityResources(): Promise<DivinityResourcesRecord> {
  return saveDivinityResources(createEmptyDivinityOwnedResources());
}
