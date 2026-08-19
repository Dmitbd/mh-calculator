import { useEffect, useMemo, useRef, useState } from "react";

import type { WeeklyRivalryEventConfig } from "@/features/game-data/weekly-rivalry";

import { calculateWeeklyRivalryEventProgress } from "../model/calculateWeeklyRivalryEventProgress";
import { normalizeWeeklyRivalryInput } from "../model/normalizeWeeklyRivalryInput";
import type {
  NormalizedWeeklyRivalryInput,
  WeeklyRivalryInput,
} from "../model/types";
import {
  createEmptyWeeklyRivalryInput,
  loadWeeklyRivalryCalculator,
  resetWeeklyRivalryCalculator,
  saveWeeklyRivalryCalculator,
} from "../storage/weeklyRivalryStorage";

type InputUpdater = (
  current: NormalizedWeeklyRivalryInput,
) => unknown;

const STORAGE_ERROR_MESSAGE =
  "Не удалось сохранить изменения. Калькулятор продолжает работать.";

export function useWeeklyRivalryCalculator(config: WeeklyRivalryEventConfig) {
  const [input, setInput] = useState(createEmptyWeeklyRivalryInput);
  const inputRef = useRef(input);
  const persistenceQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const record = await loadWeeklyRivalryCalculator(config.id);
      if (!isMounted) {
        return;
      }

      const loadedInput = normalizeWeeklyRivalryInput(record);
      inputRef.current = loadedInput;
      setInput(loadedInput);
      setIsLoaded(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [config.id]);

  const queuePersistence = (write: () => Promise<unknown>) => {
    const queuedWrite = persistenceQueueRef.current.then(write);
    persistenceQueueRef.current = queuedWrite.catch(() => undefined);
    return queuedWrite;
  };

  const persist = async (write: () => Promise<unknown>) => {
    try {
      await queuePersistence(write);
      setStorageError(null);
    } catch {
      setStorageError(STORAGE_ERROR_MESSAGE);
    }
  };

  const updateInput = async (updater: InputUpdater) => {
    const nextInput = normalizeWeeklyRivalryInput(updater(inputRef.current));
    inputRef.current = nextInput;
    setInput(nextInput);
    await persist(() => saveWeeklyRivalryCalculator(config.id, nextInput));
  };

  const setOwnedSpendResource = async (ownedSpendResource: unknown) => {
    await updateInput((current) => ({ ...current, ownedSpendResource }));
  };

  const setOwnedWeeklyEventChests = async (
    ownedWeeklyEventChests: unknown,
  ) => {
    await updateInput((current) => ({
      ...current,
      ownedWeeklyEventChests,
    }));
  };

  const setIncludeRivalryCashback = async (
    includeRivalryCashback: boolean,
  ) => {
    await updateInput((current) => ({
      ...current,
      includeRivalryCashback,
    }));
  };

  const setIncludeWeeklyEventChestCashback = async (
    includeWeeklyEventChestCashback: boolean,
  ) => {
    await updateInput((current) => ({
      ...current,
      includeWeeklyEventChestCashback,
    }));
  };

  const setIncludeQuestCashback = async (includeQuestCashback: boolean) => {
    await updateInput((current) => ({
      ...current,
      includeQuestCashback,
    }));
  };

  const setIncludeSharedCashback = async (
    includeSharedCashback: boolean,
  ) => {
    await updateInput((current) => ({
      ...current,
      includeSharedCashback,
    }));
  };

  const reset = async () => {
    const nextInput = createEmptyWeeklyRivalryInput();
    inputRef.current = nextInput;
    setInput(nextInput);
    await persist(() => resetWeeklyRivalryCalculator(config.id));
  };

  const { rivalryProgress, questProgress } = useMemo(
    () => calculateWeeklyRivalryEventProgress(input, config),
    [config, input],
  );

  return {
    input,
    rivalryProgress,
    questProgress,
    isLoaded,
    storageError,
    setOwnedSpendResource,
    setOwnedWeeklyEventChests,
    setIncludeRivalryCashback,
    setIncludeWeeklyEventChestCashback,
    setIncludeQuestCashback,
    setIncludeSharedCashback,
    reset,
  };
}
