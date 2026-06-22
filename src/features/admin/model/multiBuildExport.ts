import type { HeroBuildTab, HeroBuildTabPath } from "@/features/game-data/heroes";
import { sortBuildTabs } from "@/features/game-data/heroes";

export type BuildTargetLeafTab = {
  path: HeroBuildTabPath;
  label: string;
  gameMode: NonNullable<HeroBuildTab["gameMode"]>;
};

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
