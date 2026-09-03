import { useCallback, useEffect, useRef, useState } from "react";

import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import {
  createEmptyDivinityOwnedResources,
  normalizeDivinityResourceCount,
} from "../model/divinityOwnedResources";
import type {
  DivinityLocalDataLoadState,
  DivinityOwnedResources,
} from "../model/types";
import {
  loadDivinityResources,
  resetDivinityResources,
  saveDivinityResources,
} from "../storage/divinityResourcesStorage";

type ResourceUpdater = (
  current: DivinityOwnedResources,
) => DivinityOwnedResources;

export function useDivinityResources() {
  const [resources, setResources] = useState(createEmptyDivinityOwnedResources);
  const resourcesRef = useRef(resources);
  const [loadState, setLoadState] =
    useState<DivinityLocalDataLoadState>("loading");
  const [isRecoveryPending, setIsRecoveryPending] = useState(false);
  const isMountedRef = useRef(true);
  const recoveryInFlightRef = useRef(false);

  const applyLoadedRecord = useCallback(
    (record: Awaited<ReturnType<typeof loadDivinityResources>>) => {
      const loadedResources: DivinityOwnedResources = {
        chestCounts: record.chestCounts,
        gemCounts: record.gemCounts,
      };
      resourcesRef.current = loadedResources;
      setResources(loadedResources);
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void loadDivinityResources()
      .then((record) => {
        if (!isMounted) {
          return;
        }

        applyLoadedRecord(record);
        setLoadState("ready");
      })
      .catch(() => {
        if (isMounted) {
          setLoadState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [applyLoadedRecord]);

  const runRecovery = async (
    operation: () => ReturnType<typeof loadDivinityResources>,
  ) => {
    if (loadState !== "error" || recoveryInFlightRef.current) {
      return;
    }

    recoveryInFlightRef.current = true;
    if (isMountedRef.current) {
      setIsRecoveryPending(true);
    }

    try {
      const record = await operation();
      if (isMountedRef.current) {
        applyLoadedRecord(record);
        setLoadState("ready");
      }
    } catch {
      if (isMountedRef.current) {
        setLoadState("error");
      }
    } finally {
      recoveryInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsRecoveryPending(false);
      }
    }
  };

  const retryLoad = () => runRecovery(loadDivinityResources);

  const resetResourcesAfterLoadError = () =>
    runRecovery(resetDivinityResources);

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
    isLoaded: loadState === "ready",
    isRecoveryPending,
    loadState,
    setChestCount,
    setGemCount,
    resetResources,
    resetResourcesAfterLoadError,
    retryLoad,
  };
}
