import { useEffect, useState } from "react";

import { getCurrentDivinityStep } from "../model/getCurrentDivinityStep";
import type { DivinityLevel } from "../model/types";
import {
  loadDivinityProgress,
  resetDivinityProgress,
  saveDivinityProgress,
} from "../storage/divinityProgressStorage";

export function useDivinityProgress(levels: DivinityLevel[]) {
  const maxLevel = levels[levels.length - 1]?.level ?? 0;
  const [startLevel, setStartLevel] = useState(1);
  const [endLevel, setEndLevel] = useState(maxLevel);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [filledSegments, setFilledSegments] = useState(0);
  const [autofillEnabled, setAutofillEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadDivinityProgress().then((record) => {
      if (!isMounted) {
        return;
      }

      const safeStartLevel = Math.min(Math.max(record.startLevel, 1), Math.max(maxLevel - 1, 1));
      const safeEndLevel = Math.min(
        Math.max(record.endLevel, safeStartLevel + 1),
        maxLevel,
      );
      setStartLevel(safeStartLevel);
      setEndLevel(safeEndLevel);
      setCurrentLevel(Math.min(Math.max(record.currentLevel, safeStartLevel), safeEndLevel));
      setFilledSegments(record.filledSegments);
      setAutofillEnabled(record.autofillEnabled);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [maxLevel]);

  const persistProgress = async (
    nextCurrentLevel: number,
    nextFilledSegments: number,
    nextAutofillEnabled = autofillEnabled,
  ) => {
    await saveDivinityProgress({
      startLevel,
      endLevel,
      currentLevel: nextCurrentLevel,
      filledSegments: nextFilledSegments,
      autofillEnabled: nextAutofillEnabled,
    });
  };

  const incrementLevel = async () => {
    const step = getCurrentDivinityStep(levels, {
      startLevel,
      endLevel,
      currentLevel,
      filledSegments,
    });

    if (!step) {
      return;
    }

    if (filledSegments < step.segmentCount) {
      const nextFilledSegments = filledSegments + 1;
      setFilledSegments(nextFilledSegments);
      await persistProgress(currentLevel, nextFilledSegments);
      return;
    }

    const nextLevel = Math.min(step.level + 1, endLevel);
    setCurrentLevel(nextLevel);
    setFilledSegments(0);
    await persistProgress(nextLevel, 0);
  };

  const decrementLevel = async () => {
    if (filledSegments > 0) {
      const nextFilledSegments = filledSegments - 1;
      setFilledSegments(nextFilledSegments);
      await persistProgress(currentLevel, nextFilledSegments);
      return;
    }

    if (currentLevel <= startLevel) {
      return;
    }

    const previousLevel = levels.find((level) => level.level === currentLevel - 1);

    if (!previousLevel || previousLevel.level < startLevel) {
      return;
    }

    setCurrentLevel(previousLevel.level);
    setFilledSegments(previousLevel.segmentCount);
    await persistProgress(previousLevel.level, previousLevel.segmentCount);
  };

  const updateRange = async (nextStartLevel: number, nextEndLevel: number) => {
    const clampedCurrentLevel = autofillEnabled
      ? nextStartLevel
      : Math.min(Math.max(currentLevel, nextStartLevel), nextEndLevel);
    const shouldPreserveProgress =
      !autofillEnabled && clampedCurrentLevel === currentLevel;
    const nextFilledSegments = shouldPreserveProgress ? filledSegments : 0;

    setStartLevel(nextStartLevel);
    setEndLevel(nextEndLevel);
    setCurrentLevel(clampedCurrentLevel);
    setFilledSegments(nextFilledSegments);

    await saveDivinityProgress({
      startLevel: nextStartLevel,
      endLevel: nextEndLevel,
      currentLevel: clampedCurrentLevel,
      filledSegments: nextFilledSegments,
      autofillEnabled,
    });
  };

  const decrementStartLevel = async () => {
    const nextStartLevel = Math.max(1, startLevel - 1);
    const nextEndLevel = Math.max(endLevel, nextStartLevel + 1);
    await updateRange(nextStartLevel, nextEndLevel);
  };

  const incrementStartLevel = async () => {
    const nextStartLevel = Math.min(startLevel + 1, Math.max(maxLevel - 1, 1));
    const nextEndLevel = endLevel <= nextStartLevel ? Math.min(nextStartLevel + 1, maxLevel) : endLevel;
    await updateRange(nextStartLevel, nextEndLevel);
  };

  const decrementEndLevel = async () => {
    const candidateEndLevel = Math.max(2, endLevel - 1);
    const nextStartLevel =
      candidateEndLevel <= startLevel ? Math.max(1, candidateEndLevel - 1) : startLevel;
    const nextEndLevel = Math.max(nextStartLevel + 1, candidateEndLevel);

    await updateRange(nextStartLevel, nextEndLevel);
  };

  const incrementEndLevel = async () => {
    const nextEndLevel = Math.min(maxLevel, endLevel + 1);
    await updateRange(startLevel, nextEndLevel);
  };

  const resetLevel = async () => {
    const record = await resetDivinityProgress();
    setStartLevel(record.startLevel);
    setEndLevel(record.endLevel);
    setCurrentLevel(record.currentLevel);
    setFilledSegments(record.filledSegments);
    setAutofillEnabled(record.autofillEnabled);
  };

  const toggleAutofill = async () => {
    const nextAutofillEnabled = !autofillEnabled;
    setAutofillEnabled(nextAutofillEnabled);

    await persistProgress(currentLevel, filledSegments, nextAutofillEnabled);
  };

  const canDecrement = currentLevel > startLevel || filledSegments > 0;

  return {
    startLevel,
    endLevel,
    currentLevel,
    autofillEnabled,
    filledSegments,
    decrementEndLevel,
    decrementLevel,
    decrementStartLevel,
    canDecrement,
    incrementLevel,
    incrementEndLevel,
    incrementStartLevel,
    isLoaded,
    resetLevel,
    toggleAutofill,
  };
}
