import {
  filterTabsWithReadyBuilds,
  getDefaultTabPath,
  type HeroBuildSet,
} from "@/features/game-data/heroes";
import type { HeroBuildTabPath } from "@/features/game-data/heroes/types";

export type HeroBuildLoadState = {
  activePath: HeroBuildTabPath;
  buildSet: HeroBuildSet | null;
  heroId: string;
  isLoading: boolean;
};

export function createHeroBuildLoadState({
  fallbackBuildSet,
  hasRemoteClient,
  heroId,
}: {
  fallbackBuildSet: HeroBuildSet | null;
  hasRemoteClient: boolean;
  heroId: string;
}): HeroBuildLoadState {
  const buildSet = hasRemoteClient ? null : fallbackBuildSet;
  const readyTabs = buildSet ? filterTabsWithReadyBuilds(buildSet.tabs) : [];

  return {
    activePath: readyTabs.length > 0 ? getDefaultTabPath(readyTabs) : [],
    buildSet,
    heroId,
    isLoading: hasRemoteClient,
  };
}

export function resolveHeroBuildLoadState(
  current: HeroBuildLoadState,
  buildSet: HeroBuildSet | null,
): HeroBuildLoadState {
  const readyTabs = buildSet ? filterTabsWithReadyBuilds(buildSet.tabs) : [];

  return {
    activePath: readyTabs.length > 0 ? getDefaultTabPath(readyTabs) : [],
    buildSet,
    heroId: current.heroId,
    isLoading: false,
  };
}
