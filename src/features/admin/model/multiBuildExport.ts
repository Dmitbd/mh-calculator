import type { DivinityBranchBuildExport } from "@/features/game-data/builds/types";
import type { HeroBuildTab, HeroBuildTabPath } from "@/features/game-data/heroes";
import type { HeroBuildSet } from "@/features/game-data/heroes";
import { sortBuildTabs } from "@/features/game-data/heroes";

import type {
  BranchBuildValidationError,
  BranchBuildValidationResult,
} from "../types/admin.types";
import { validateBranchBuild } from "../utils/validateBranchBuild";

export type BuildTargetLeafTab = {
  path: HeroBuildTabPath;
  label: string;
  gameMode: NonNullable<HeroBuildTab["gameMode"]>;
};

export type SavedBuildsByPath = Record<string, DivinityBranchBuildExport>;

type ValidationCatalog = Parameters<typeof validateBranchBuild>[1];

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
  rootTabs: readonly HeroBuildTab[] = tabs,
): BuildTargetLeafTab[] {
  return sortBuildTabs([...tabs]).flatMap((tab) => {
    const path = [...parentPath, tab.id];
    const gameMode = tab.gameMode ?? inheritedGameMode;

    if (tab.kind === "group" && tab.children) {
      return getBuildTargetLeafTabs(tab.children, path, gameMode, rootTabs);
    }

    if (!gameMode) {
      return [];
    }

    return [
      {
        path,
        label: getBuildTargetPathLabel(rootTabs, path),
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

export function validateMultiBuildExport(params: {
  targetTabs: readonly HeroBuildTab[];
  savedBuilds: SavedBuildsByPath;
  validationCatalog: ValidationCatalog;
}): BranchBuildValidationResult {
  const errors: BranchBuildValidationError[] = [];

  getBuildTargetLeafTabs(params.targetTabs).forEach((leaf) => {
    const key = getBuildTargetPathKey(leaf.path);
    const build = params.savedBuilds[key];

    if (!build) {
      errors.push({
        code: "multiBuild.missingTab",
        message: `${leaf.label}: Сохраните билд для этой вкладки.`,
        path: key,
      });
      return;
    }

    if (build.gameMode !== leaf.gameMode) {
      errors.push({
        code: "multiBuild.gameModeMismatch",
        message: `${leaf.label}: Режим игры не соответствует выбранной вкладке.`,
        path: key,
      });
    }

    const result = validateBranchBuild(
      {
        gameMode: build.gameMode,
        heroId: build.heroId,
        heroName: build.heroName,
        columns: build.columns,
        majorNodes: build.majorNodes,
        weaponAwakening: build.weaponAwakening,
        equipment: build.equipment,
        progress: build.progress,
      },
      params.validationCatalog,
    );

    result.errors.forEach((error) => {
      errors.push({
        ...error,
        message: `${leaf.label}: ${error.message}`,
        path: error.path ? `${key}.${error.path}` : key,
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
