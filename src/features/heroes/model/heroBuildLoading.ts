import {
  filterTabsWithReadyBuilds,
  getDefaultTabPath,
  type HeroBuildSet,
} from "@/features/game-data/heroes";
import type { HeroBuildTabPath } from "@/features/game-data/heroes/types";
import {
  createSourceSelectionState,
  rejectBootstrap,
  rejectResource,
  type SourceSelectionState,
} from "@/shared/lib/sourceSelection";

export type HeroBuildSourceResources = {
  heroBuilds: HeroBuildSet | null;
};

export type HeroBuildLoadState = {
  activePath: HeroBuildTabPath;
  buildSet: HeroBuildSet | null;
  heroId: string;
  isLoading: boolean;
  sourceSelection: SourceSelectionState<HeroBuildSourceResources>;
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
  let sourceSelection = createSourceSelectionState({
    heroBuilds: fallbackBuildSet,
  });
  if (!hasRemoteClient) {
    sourceSelection = rejectBootstrap(sourceSelection, "not-configured");
    sourceSelection = rejectResource(
      sourceSelection,
      "heroBuilds",
      "not-configured",
    );
  }
  const buildSet = sourceSelection.resources.heroBuilds.data;
  const readyTabs = buildSet ? filterTabsWithReadyBuilds(buildSet.tabs) : [];

  return {
    activePath: readyTabs.length > 0 ? getDefaultTabPath(readyTabs) : [],
    buildSet,
    heroId,
    isLoading: sourceSelection.resources.heroBuilds.source === "checking",
    sourceSelection,
  };
}

export function resolveHeroBuildLoadState(
  current: HeroBuildLoadState,
  sourceSelection: SourceSelectionState<HeroBuildSourceResources>,
): HeroBuildLoadState {
  const buildSet = sourceSelection.resources.heroBuilds.data;
  const readyTabs = buildSet ? filterTabsWithReadyBuilds(buildSet.tabs) : [];

  return {
    activePath: readyTabs.length > 0 ? getDefaultTabPath(readyTabs) : [],
    buildSet,
    heroId: current.heroId,
    isLoading: sourceSelection.resources.heroBuilds.source === "checking",
    sourceSelection,
  };
}
