import { useEffect, useRef, useState } from "react";

import { adjustSummonPurchase } from "../model/normalizeSummonRivalryInput";
import type { SummonRivalryInput } from "../model/types";
import {
  createEmptySummonRivalryInput,
  loadSummonRivalryCalculator,
  normalizeSummonRivalryCalculatorInput,
  resetSummonRivalryCalculator,
  saveSummonRivalryCalculator,
} from "../storage/summonRivalryStorage";
import type { SummonRivalryCalculatorInput } from "../storage/summonRivalryStorage";

type InputUpdater = (
  current: SummonRivalryCalculatorInput,
) => Partial<SummonRivalryInput>;

export type SummonPurchaseKind =
  | "purchasedCommonScrolls"
  | "purchasedLimitedScrolls"
  | "purchasedFateCrystals";

const STORAGE_ERROR_MESSAGE =
  "Не удалось сохранить изменения. Калькулятор продолжает работать.";

export function useSummonRivalryCalculator() {
  const [input, setInput] = useState(createEmptySummonRivalryInput);
  const inputRef = useRef(input);
  const persistenceQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      let loadedInput = createEmptySummonRivalryInput();

      try {
        const record = await loadSummonRivalryCalculator();
        loadedInput = normalizeSummonRivalryCalculatorInput(record);
      } catch {
        loadedInput = createEmptySummonRivalryInput();
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
    const nextInput = normalizeSummonRivalryCalculatorInput(
      updater(inputRef.current),
    );
    inputRef.current = nextInput;
    setInput(nextInput);
    await persist(() => saveSummonRivalryCalculator(nextInput));
  };

  const setOwnedCommonScrolls = async (ownedCommonScrolls: unknown) => {
    await updateInput((current) => ({ ...current, ownedCommonScrolls }));
  };

  const setOwnedLimitedScrolls = async (ownedLimitedScrolls: unknown) => {
    await updateInput((current) => ({ ...current, ownedLimitedScrolls }));
  };

  const setOwnedFactionScrolls = async (ownedFactionScrolls: unknown) => {
    await updateInput((current) => ({ ...current, ownedFactionScrolls }));
  };

  const setOwnedFateCrystals = async (ownedFateCrystals: unknown) => {
    await updateInput((current) => ({ ...current, ownedFateCrystals }));
  };

  const setIncludeCashback = async (includeCashback: boolean) => {
    await updateInput((current) => ({ ...current, includeCashback }));
  };

  const adjustPurchase = async (
    kind: SummonPurchaseKind,
    direction: -1 | 1,
  ) => {
    await updateInput((current) => ({
      ...current,
      [kind]: adjustSummonPurchase(current[kind], direction),
    }));
  };

  const incrementPurchase = async (kind: SummonPurchaseKind) => {
    await adjustPurchase(kind, 1);
  };

  const decrementPurchase = async (kind: SummonPurchaseKind) => {
    await adjustPurchase(kind, -1);
  };

  const reset = async () => {
    const nextInput = createEmptySummonRivalryInput();
    inputRef.current = nextInput;
    setInput(nextInput);
    await persist(resetSummonRivalryCalculator);
  };

  return {
    input,
    isLoaded,
    storageError,
    setOwnedCommonScrolls,
    setOwnedLimitedScrolls,
    setOwnedFactionScrolls,
    setOwnedFateCrystals,
    incrementPurchase,
    decrementPurchase,
    setIncludeCashback,
    reset,
  };
}
