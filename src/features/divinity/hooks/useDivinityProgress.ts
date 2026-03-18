import { useEffect, useState } from "react";

import {
  loadDivinityProgress,
  resetDivinityProgress,
  saveDivinityProgress,
} from "../storage/divinityProgressStorage";

export function useDivinityProgress(maxLevel: number) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadDivinityProgress().then((record) => {
      if (!isMounted) {
        return;
      }

      setCurrentLevel(Math.min(record.currentLevel, maxLevel));
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [maxLevel]);

  const incrementLevel = async () => {
    const nextLevel = Math.min(currentLevel + 1, maxLevel);
    setCurrentLevel(nextLevel);
    await saveDivinityProgress({ currentLevel: nextLevel });
  };

  const resetLevel = async () => {
    const record = await resetDivinityProgress();
    setCurrentLevel(record.currentLevel);
  };

  return {
    currentLevel,
    incrementLevel,
    isLoaded,
    resetLevel,
  };
}
