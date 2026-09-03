import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import type { DivinityOwnedResources } from "./types";

export const divinityGemLevels: DivinityGemLevel[] = [1, 2, 3, 4, 5, 6, 7];

export const MAX_DIVINITY_RESOURCE_COUNT = 999;

export function normalizeDivinityResourceCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    MAX_DIVINITY_RESOURCE_COUNT,
    Math.max(0, Math.trunc(value)),
  );
}

type DivinityOwnedResourcesInput = {
  chestCounts?: Partial<Record<DivinityGemChestId, unknown>> | null;
  gemCounts?: Partial<Record<DivinityGemLevel, unknown>> | null;
};

export function normalizeDivinityOwnedResources(
  resources?: DivinityOwnedResourcesInput,
): DivinityOwnedResources {
  return {
    chestCounts: {
      "600001": normalizeDivinityResourceCount(
        resources?.chestCounts?.["600001"],
      ),
      "600076": normalizeDivinityResourceCount(
        resources?.chestCounts?.["600076"],
      ),
    },
    gemCounts: {
      1: normalizeDivinityResourceCount(resources?.gemCounts?.[1]),
      2: normalizeDivinityResourceCount(resources?.gemCounts?.[2]),
      3: normalizeDivinityResourceCount(resources?.gemCounts?.[3]),
      4: normalizeDivinityResourceCount(resources?.gemCounts?.[4]),
      5: normalizeDivinityResourceCount(resources?.gemCounts?.[5]),
      6: normalizeDivinityResourceCount(resources?.gemCounts?.[6]),
      7: normalizeDivinityResourceCount(resources?.gemCounts?.[7]),
    },
  };
}

export function createEmptyDivinityOwnedResources(): DivinityOwnedResources {
  return normalizeDivinityOwnedResources();
}
