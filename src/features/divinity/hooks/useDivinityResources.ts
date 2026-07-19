import { useEffect, useRef, useState } from "react";

import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import {
  createEmptyDivinityOwnedResources,
  normalizeDivinityResourceCount,
} from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";
import {
  loadDivinityResources,
  saveDivinityResources,
} from "../storage/divinityResourcesStorage";

type ResourceUpdater = (
  current: DivinityOwnedResources,
) => DivinityOwnedResources;

export function useDivinityResources() {
  const [resources, setResources] = useState(createEmptyDivinityOwnedResources);
  const resourcesRef = useRef(resources);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadDivinityResources().then((record) => {
      if (!isMounted) {
        return;
      }

      const loadedResources: DivinityOwnedResources = {
        chestCounts: record.chestCounts,
        gemCounts: record.gemCounts,
      };
      resourcesRef.current = loadedResources;
      setResources(loadedResources);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateResources = async (updater: ResourceUpdater) => {
    const nextResources = updater(resourcesRef.current);
    resourcesRef.current = nextResources;
    setResources(nextResources);
    await saveDivinityResources(nextResources);
  };

  const setChestCount = async (
    chestId: DivinityGemChestId,
    count: number,
  ) => {
    await updateResources((current) => ({
      ...current,
      chestCounts: {
        ...current.chestCounts,
        [chestId]: normalizeDivinityResourceCount(count),
      },
    }));
  };

  const setGemCount = async (level: DivinityGemLevel, count: number) => {
    await updateResources((current) => ({
      ...current,
      gemCounts: {
        ...current.gemCounts,
        [level]: normalizeDivinityResourceCount(count),
      },
    }));
  };

  const resetResources = async () => {
    await updateResources(() => createEmptyDivinityOwnedResources());
  };

  return {
    resources,
    isLoaded,
    setChestCount,
    setGemCount,
    resetResources,
  };
}
