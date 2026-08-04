import { useEffect, useRef, useState } from "react";

import {
  convertToTempleMap,
  convertToTombMaps,
} from "../model/allocateAntiqueCoins";
import type { AntiqueRivalryInput } from "../model/types";
import {
  createEmptyAntiqueCalculatorInput,
  loadAntiqueCalculator,
  normalizeAntiqueCalculatorInput,
  resetAntiqueCalculator,
  saveAntiqueCalculator,
} from "../storage/antiqueCalculatorStorage";
import type { AntiqueCalculatorInput } from "../storage/antiqueCalculatorStorage";

type InputUpdater = (
  current: AntiqueCalculatorInput,
) => Partial<AntiqueRivalryInput>;

const STORAGE_ERROR_MESSAGE =
  "Не удалось сохранить изменения. Калькулятор продолжает работать.";

export function useAntiqueCalculator() {
  const [input, setInput] = useState(createEmptyAntiqueCalculatorInput);
  const inputRef = useRef(input);
  const persistenceQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      let loadedInput = createEmptyAntiqueCalculatorInput();

      try {
        const record = await loadAntiqueCalculator();
        loadedInput = {
          coins: record.coins,
          templeMapAllocation: record.templeMapAllocation,
          ownedTombMaps: record.ownedTombMaps,
          ownedTempleMaps: record.ownedTempleMaps,
        };
      } catch {
        loadedInput = createEmptyAntiqueCalculatorInput();
      } finally {
        if (!isMounted) {
          return;
        }

        inputRef.current = loadedInput;
        setInput(loadedInput);
        setIsLoaded(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

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
    const nextInput = normalizeAntiqueCalculatorInput(updater(inputRef.current));
    inputRef.current = nextInput;
    setInput(nextInput);
    await persist(() => saveAntiqueCalculator(nextInput));
  };

  const setCoins = async (coins: unknown) => {
    await updateInput((current) => ({ ...current, coins }));
  };

  const setOwnedTombMaps = async (ownedTombMaps: unknown) => {
    await updateInput((current) => ({ ...current, ownedTombMaps }));
  };

  const setOwnedTempleMaps = async (ownedTempleMaps: unknown) => {
    await updateInput((current) => ({ ...current, ownedTempleMaps }));
  };

  const convertOneToTemple = async () => {
    await updateInput((current) => ({
      ...current,
      templeMapAllocation: convertToTempleMap(current),
    }));
  };

  const convertOneToTombs = async () => {
    await updateInput((current) => ({
      ...current,
      templeMapAllocation: convertToTombMaps(current),
    }));
  };

  const reset = async () => {
    const nextInput = createEmptyAntiqueCalculatorInput();
    inputRef.current = nextInput;
    setInput(nextInput);
    await persist(resetAntiqueCalculator);
  };

  return {
    input,
    isLoaded,
    storageError,
    setCoins,
    setOwnedTombMaps,
    setOwnedTempleMaps,
    convertOneToTemple,
    convertOneToTombs,
    reset,
  };
}
