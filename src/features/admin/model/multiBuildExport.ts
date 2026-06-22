import type { DivinityBranchBuildExport } from "@/features/game-data/builds/types";
import type { HeroBuildTab, HeroBuildTabPath } from "@/features/game-data/heroes";
import type { HeroBuildSet } from "@/features/game-data/heroes";
import { sortBuildTabs } from "@/features/game-data/heroes";

export type BuildTargetLeafTab = {
  path: HeroBuildTabPath;
  label: string;
  gameMode: NonNullable<HeroBuildTab["gameMode"]>;
};

export type SavedBuildsByPath = Record<string, DivinityBranchBuildExport>;

export function getBuildTargetPathKey(path: HeroBuildTabPath): string {
  return path.join("/");
}

export function getBuildTargetPathLabel(
  tabs: readonly HeroBuildTab[],
  path: HeroBuildTabPath,
): string {
  const labels: string[] = [];
  let currentTabs = [...tabs];

  for (const segment of path) {
    const tab = sortBuildTabs(currentTabs).find((entry) => entry.id === segment);

    if (!tab) {
      return path.join(" -> ");
    }

    labels.push(tab.label);
    currentTabs = tab.children ? [...tab.children] : [];
  }

  return labels.join(" -> ");
}

export function getBuildTargetLeafTabs(
  tabs: readonly HeroBuildTab[],
  parentPath: HeroBuildTabPath = [],
  inheritedGameMode?: HeroBuildTab["gameMode"],
): BuildTargetLeafTab[] {
  return sortBuildTabs([...tabs]).flatMap((tab) => {
    const path = [...parentPath, tab.id];
    const gameMode = tab.gameMode ?? inheritedGameMode;

    if (tab.kind === "group" && tab.children) {
      return getBuildTargetLeafTabs(tab.children, path, gameMode);
    }

    if (!gameMode) {
      return [];
    }

    return [
      {
        path,
        label: getBuildTargetPathLabel(tabs, path),
        gameMode,
      },
    ];
  });
}

export function buildHeroBuildSetFromSavedBuilds(
  tabs: readonly HeroBuildTab[],
  savedBuilds: SavedBuildsByPath,
): HeroBuildSet {
  return {
    schemaVersion: 2,
    tabs: sortBuildTabs([...tabs]).map((tab) =>
      attachSavedBuildToTab(tab, savedBuilds, []),
    ),
  };
}

function attachSavedBuildToTab(
  tab: HeroBuildTab,
  savedBuilds: SavedBuildsByPath,
  parentPath: HeroBuildTabPath,
): HeroBuildTab {
  const path = [...parentPath, tab.id];

  if (tab.kind === "group") {
    return {
      ...tab,
      build: null,
      children: tab.children?.map((child) =>
        attachSavedBuildToTab(child, savedBuilds, path),
      ),
    };
  }

  return {
    ...tab,
    build: savedBuilds[getBuildTargetPathKey(path)] ?? null,
  };
}
