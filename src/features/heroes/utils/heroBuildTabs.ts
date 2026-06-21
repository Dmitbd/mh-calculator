import type { DivinityGameMode, DivinityBranchBuildExport } from "@/features/game-data/builds/types";
import type {
  HeroBuildSet,
  HeroBuildTab,
  HeroBuildTabPath,
} from "@/features/heroes/types/heroes.types";

/** Сортирует вкладки и дочерние вкладки по order */
export function sortBuildTabs(tabs: HeroBuildTab[]): HeroBuildTab[] {
  return [...tabs]
    .sort((first, second) => first.order - second.order)
    .map((tab) => ({
      ...tab,
      children: tab.children ? sortBuildTabs(tab.children) : undefined,
    }));
}

/**
 * Оставляет только вкладки с готовым билдом.
 * Группа показывается, если у неё есть хотя бы одна видимая дочерняя вкладка.
 */
export function filterTabsWithReadyBuilds(tabs: HeroBuildTab[]): HeroBuildTab[] {
  const result: HeroBuildTab[] = [];

  for (const tab of sortBuildTabs(tabs)) {
    if (tab.kind === "build") {
      if (tab.build !== null) {
        result.push(tab);
      }

      continue;
    }

    if (tab.kind === "group" && tab.children) {
      const visibleChildren = filterTabsWithReadyBuilds(tab.children);

      if (visibleChildren.length > 0) {
        result.push({
          ...tab,
          children: visibleChildren,
        });
      }
    }
  }

  return result;
}

/** Ищет первую вкладку с готовым билдом в дереве */
export function findFirstReadyBuildTab(tabs: HeroBuildTab[]): HeroBuildTab | null {
  for (const tab of sortBuildTabs(tabs)) {
    if (tab.kind === "build" && tab.build !== null) {
      return tab;
    }

    if (tab.kind === "group" && tab.children) {
      const nested = findFirstReadyBuildTab(tab.children);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

/** Путь к первой вкладке с готовым билдом */
export function findFirstReadyBuildPath(tabs: HeroBuildTab[]): HeroBuildTabPath | null {
  for (const tab of sortBuildTabs(tabs)) {
    if (tab.kind === "build" && tab.build !== null) {
      return [tab.id];
    }

    if (tab.kind === "group" && tab.children) {
      const nestedPath = findFirstReadyBuildPath(tab.children);

      if (nestedPath) {
        return [tab.id, ...nestedPath];
      }
    }
  }

  return null;
}

/** Есть ли хотя бы один готовый билд в дереве вкладок */
export function hasReadyBuildInTabs(tabs: HeroBuildTab[]): boolean {
  return findFirstReadyBuildPath(tabs) !== null;
}

/** Находит вкладку по пути id; при отсутствии — null */
export function getTabByPath(
  tabs: HeroBuildTab[],
  path: HeroBuildTabPath,
): HeroBuildTab | null {
  if (path.length === 0) {
    return null;
  }

  const [head, ...tail] = path;
  const tab = sortBuildTabs(tabs).find((entry) => entry.id === head);

  if (!tab) {
    return null;
  }

  if (tail.length === 0) {
    return tab;
  }

  if (!tab.children) {
    return null;
  }

  return getTabByPath(tab.children, tail);
}

/** Первый доступный путь: для группы — первый дочерний лист */
export function getFirstSelectablePath(tabs: HeroBuildTab[]): HeroBuildTabPath {
  const sorted = sortBuildTabs(tabs);

  if (sorted.length === 0) {
    return [];
  }

  const first = sorted[0];

  if (first.kind === "group" && first.children && first.children.length > 0) {
    const childPath = getFirstSelectablePath(first.children);
    return [first.id, ...childPath];
  }

  return [first.id];
}

/** Путь по умолчанию: tabs[0]; для группы — первый дочерний элемент массива */
export function getDefaultTabPathFromTabs(tabs: HeroBuildTab[]): HeroBuildTabPath {
  const first = tabs[0];

  if (!first) {
    return [];
  }

  if (first.kind === "group" && first.children && first.children.length > 0) {
    return [first.id, ...getDefaultTabPathFromTabs(first.children)];
  }

  return [first.id];
}

/** Билд по пути вкладки */
export function getBuildAtPath(
  tabs: HeroBuildTab[],
  path: HeroBuildTabPath,
): DivinityBranchBuildExport | null {
  const tab = getTabByPath(tabs, path);

  if (!tab || tab.kind !== "build") {
    return null;
  }

  return tab.build;
}

/** Путь по умолчанию: сначала готовый билд, иначе первый доступный */
export function getDefaultTabPath(tabs: HeroBuildTab[]): HeroBuildTabPath {
  return findFirstReadyBuildPath(tabs) ?? getFirstSelectablePath(tabs);
}

/**
 * Режим игры по пути вкладки.
 * Берёт gameMode с выбранной вкладки или ближайшего родителя.
 */
export function getGameModeForPath(
  tabs: HeroBuildTab[],
  path: HeroBuildTabPath,
): DivinityGameMode | null {
  if (path.length === 0) {
    return null;
  }

  let currentTabs = sortBuildTabs(tabs);
  let resolvedGameMode: DivinityGameMode | undefined;

  for (let index = 0; index < path.length; index += 1) {
    const segmentId = path[index];
    const tab = currentTabs.find((entry) => entry.id === segmentId);

    if (!tab) {
      return null;
    }

    if (tab.gameMode) {
      resolvedGameMode = tab.gameMode;
    }

    const hasMoreSegments = index < path.length - 1;

    if (hasMoreSegments) {
      if (!tab.children) {
        return null;
      }

      currentTabs = sortBuildTabs(tab.children);
    }
  }

  return resolvedGameMode ?? null;
}

/** Рекурсивная валидация дерева вкладок HeroBuildSet */
export function validateHeroBuildTabs(buildSet: HeroBuildSet): string[] {
  const errors: string[] = [];

  if (buildSet.schemaVersion !== 2) {
    errors.push("schemaVersion must be 2");
    return errors;
  }

  if (!Array.isArray(buildSet.tabs) || buildSet.tabs.length === 0) {
    errors.push("tabs must be a non-empty array");
    return errors;
  }

  validateTabLevel(buildSet.tabs, errors, []);

  return errors;
}

function validateTabLevel(
  tabs: HeroBuildTab[],
  errors: string[],
  path: string[],
  inheritedGameMode?: DivinityGameMode,
): void {
  const siblingIds = new Set<string>();

  for (const tab of tabs) {
    const tabPath = [...path, tab.id].join(".");

    if (siblingIds.has(tab.id)) {
      errors.push(`duplicate sibling id "${tab.id}" at ${tabPath}`);
    }

    siblingIds.add(tab.id);

    if (typeof tab.order !== "number") {
      errors.push(`order must be a number at ${tabPath}`);
    }

    if (tab.kind !== "build" && tab.kind !== "group") {
      errors.push(`kind must be "build" or "group" at ${tabPath}`);
    }

    const resolvedGameMode = tab.gameMode ?? inheritedGameMode;

    if (tab.kind === "group") {
      if (tab.build !== null) {
        errors.push(`group tab must have build: null at ${tabPath}`);
      }

      if (!tab.children || tab.children.length === 0) {
        errors.push(`group tab must have non-empty children at ${tabPath}`);
      } else {
        validateTabLevel(tab.children, errors, [...path, tab.id], resolvedGameMode);
      }
    }

    if (tab.kind === "build") {
      if (tab.children !== undefined && tab.children.length > 0) {
        errors.push(`build tab must not have children at ${tabPath}`);
      }

      if (tab.build !== null) {
        if (!resolvedGameMode) {
          errors.push(`ready build requires resolved gameMode at ${tabPath}`);
        } else if (tab.build.gameMode !== resolvedGameMode) {
          errors.push(
            `build gameMode "${tab.build.gameMode}" does not match tab gameMode "${resolvedGameMode}" at ${tabPath}`,
          );
        }
      }
    }
  }
}
