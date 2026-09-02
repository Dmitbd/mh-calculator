import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  divinityTalentConfig,
  type DivinityTalentBranchId,
} from "@/features/game-data/divinity-talents";

import { advanceDivinityTalentSelection } from "../model/advanceDivinityTalentSelection";
import { calculateDivinityTalentResources } from "../model/calculateDivinityTalentResources";
import {
  EMPTY_DIVINITY_TALENT_SELECTIONS,
  type DivinityTalentRequiredResources,
  type DivinityTalentSelections,
} from "../model/types";
import {
  loadDivinityTalentSelections,
  saveDivinityTalentSelections,
} from "../storage/divinityTalentStorage";

const STORAGE_ERROR_MESSAGE =
  "Не удалось сохранить изменения. Калькулятор продолжает работать.";

export type UseDivinityTalentCalculatorResult = {
  readonly selections: DivinityTalentSelections;
  readonly requiredResources: DivinityTalentRequiredResources;
  readonly isLoaded: boolean;
  readonly storageError: string | null;
  readonly selectNode: (
    branchId: DivinityTalentBranchId,
    level: number,
  ) => Promise<void>;
  readonly reset: () => Promise<void>;
};

export function useDivinityTalentCalculator(): UseDivinityTalentCalculatorResult {
  const config = divinityTalentConfig;
  const [selections, setSelections] =
    useState<DivinityTalentSelections>(EMPTY_DIVINITY_TALENT_SELECTIONS);
  const selectionsRef = useRef(selections);
  const isLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const latestSaveRef = useRef<Promise<unknown> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    void (async () => {
      let loadedSelections: DivinityTalentSelections =
        EMPTY_DIVINITY_TALENT_SELECTIONS;

      try {
        const record = await loadDivinityTalentSelections();
        loadedSelections = record.selections;
      } catch {
        loadedSelections = EMPTY_DIVINITY_TALENT_SELECTIONS;
      } finally {
        if (!mountedRef.current) {
          return;
        }

        selectionsRef.current = loadedSelections;
        setSelections(loadedSelections);
        isLoadedRef.current = true;
        setIsLoaded(true);
      }
    })();

    return () => {
      mountedRef.current = false;
      isLoadedRef.current = false;
    };
  }, []);

  const persist = useCallback(
    async (nextSelections: DivinityTalentSelections) => {
      const savePromise = saveDivinityTalentSelections(nextSelections);
      latestSaveRef.current = savePromise;

      try {
        await savePromise;
        if (
          mountedRef.current &&
          latestSaveRef.current === savePromise
        ) {
          setStorageError(null);
        }
      } catch {
        if (
          mountedRef.current &&
          latestSaveRef.current === savePromise
        ) {
          setStorageError(STORAGE_ERROR_MESSAGE);
        }
      } finally {
        if (latestSaveRef.current === savePromise) {
          latestSaveRef.current = null;
        }
      }
    },
    [],
  );

  const selectNode = useCallback(
    async (branchId: DivinityTalentBranchId, level: number) => {
      if (!mountedRef.current || !isLoadedRef.current) {
        return;
      }

      const branch = config.branches.find((item) => item.id === branchId);
      if (!branch) {
        return;
      }

      const currentSelection = selectionsRef.current[branchId];
      const nextSelection = advanceDivinityTalentSelection(
        currentSelection,
        level,
        branch.nodes.map((node) => node.level),
      );
      if (nextSelection === currentSelection) {
        return;
      }

      const nextSelections: DivinityTalentSelections = {
        ...selectionsRef.current,
        [branchId]: nextSelection,
      };
      selectionsRef.current = nextSelections;
      setSelections(nextSelections);
      await persist(nextSelections);
    },
    [config, persist],
  );

  const reset = useCallback(async () => {
    if (!mountedRef.current || !isLoadedRef.current) {
      return;
    }

    const nextSelections = EMPTY_DIVINITY_TALENT_SELECTIONS;
    selectionsRef.current = nextSelections;
    setSelections(nextSelections);
    await persist(nextSelections);
  }, [persist]);

  const requiredResources = useMemo(
    () => calculateDivinityTalentResources(config, selections),
    [config, selections],
  );

  return {
    selections,
    requiredResources,
    isLoaded,
    storageError,
    selectNode,
    reset,
  };
}
