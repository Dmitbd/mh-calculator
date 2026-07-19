import { useEffect, useRef, useState } from "react";

import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import { createEmptyDivinityOwnedResources } from "../model/divinityOwnedResources";
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

  const incrementChest = async (chestId: DivinityGemChestId) => {
    await updateResources((current) => ({
      ...current,
      chestCounts: {
        ...current.chestCounts,
        [chestId]: current.chestCounts[chestId] + 1,
      },
    }));
  };

  const decrementChest = async (chestId: DivinityGemChestId) => {
    await updateResources((current) => ({
      ...current,
      chestCounts: {
        ...current.chestCounts,
        [chestId]: Math.max(0, current.chestCounts[chestId] - 1),
      },
    }));
  };

  const incrementGem = async (level: DivinityGemLevel) => {
    await updateResources((current) => ({
      ...current,
      gemCounts: {
        ...current.gemCounts,
        [level]: current.gemCounts[level] + 1,
      },
    }));
  };

  const decrementGem = async (level: DivinityGemLevel) => {
    await updateResources((current) => ({
      ...current,
      gemCounts: {
        ...current.gemCounts,
        [level]: Math.max(0, current.gemCounts[level] - 1),
      },
    }));
  };

  const resetResources = async () => {
    await updateResources(() => createEmptyDivinityOwnedResources());
  };

  return {
    resources,
    isLoaded,
    incrementChest,
    decrementChest,
    incrementGem,
    decrementGem,
    resetResources,
  };
}
