import { useCallback, useMemo, useState } from "react";

import template from "@/features/game-data/divinity/tree-template.json";

import {
  buildTargetTabs,
  defaultBuildTargetTabPath,
} from "../data/buildTargetTabs";
import type {
  ActiveBranchNode,
  BranchColumnId,
  BranchProgressLevels,
  DivinityBranchBuilderExport,
  DivinityBranchBuildMajorNode,
  DivinityBranchBuildValidationDraft,
  DivinityBranchId,
  DraftBranchColumns,
  EquipmentVariantSelection,
  HeroBuildTargetTabPath,
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
} from "../types/admin.types";
import {
  buildWeaponAwakeningSlots,
  getNextWeaponAwakeningColor,
} from "../utils/weaponAwakening";
import {
  getGameModeForPath,
  getTabByPath,
  sortBuildTabs,
} from "@/features/heroes/utils/heroBuildTabs";

type MajorSkillSelections = Partial<Record<string, string>>;
type WeaponAwakeningSelections = Partial<Record<number, WeaponAwakeningColorId>>;

const emptySelectedBranches: DraftBranchColumns = {
  left: null,
  center: null,
  right: null,
};

const columnIds: BranchColumnId[] = ["left", "center", "right"];

/** Путь целевой вкладки по умолчанию — первая вкладка в buildTargetTabs */
const defaultTargetTabPath: HeroBuildTargetTabPath = defaultBuildTargetTabPath;

// Уровни нод по каждому столбцу (отсортированы) — для расчёта прогресса и отката
const columnNodeLevels: Record<string, number[]> = (() => {
  const map: Record<string, number[]> = {};

  template.forEach((node) => {
    (map[node.columnId] ??= []).push(node.level);
  });

  Object.values(map).forEach((levels) => levels.sort((first, second) => first - second));

  return map;
})();

// Предыдущий уровень ноды в столбце (строго ниже переданного) или null
function getPreviousNodeLevel(
  columnId: BranchColumnId,
  level: number,
): number | null {
  const levels = columnNodeLevels[columnId] ?? [];
  const below = levels.filter((nodeLevel) => nodeLevel < level);
  return below.length ? below[below.length - 1] : null;
}

export function useDivinityBranchBuilder(
  weaponAwakeningCatalog: {
    colors: readonly WeaponAwakeningColor[];
    slots: readonly WeaponAwakeningSlot[];
  },
) {
  const [targetTabPath, setTargetTabPath] =
    useState<HeroBuildTargetTabPath>(defaultTargetTabPath);
  const gameMode =
    getGameModeForPath(buildTargetTabs, targetTabPath) ??
    getGameModeForPath(buildTargetTabs, defaultTargetTabPath) ??
    buildTargetTabs[0]?.gameMode ??
    "pvp";
  const [heroName, setHeroName] = useState("");
  const [selectedBranches, setSelectedBranches] =
    useState<DraftBranchColumns>(emptySelectedBranches);
  const [selectedMajorSkills, setSelectedMajorSkills] =
    useState<MajorSkillSelections>({});
  const [weaponAwakeningSelections, setWeaponAwakeningSelections] =
    useState<WeaponAwakeningSelections>({});
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const [selectedRuneIds, setSelectedRuneIds] = useState<string[]>([]);
  const [progressLevels, setProgressLevels] = useState<BranchProgressLevels>({});

  const setTargetTopTab = useCallback((topTabId: string) => {
    const tab = getTabByPath(buildTargetTabs, [topTabId]);

    if (!tab) {
      return;
    }

    if (tab.kind === "group" && tab.children && tab.children.length > 0) {
      const firstChild = sortBuildTabs(tab.children)[0];
      setTargetTabPath([topTabId, firstChild.id]);
      return;
    }

    setTargetTabPath([topTabId]);
  }, []);

  const setTargetChildTab = useCallback((childTabId: string) => {
    setTargetTabPath((current) => [current[0], childTabId]);
  }, []);

  const setColumnBranch = useCallback(
    (columnId: BranchColumnId, branchId: DivinityBranchId | null) => {
      setSelectedBranches((current) => ({
        ...current,
        [columnId]: branchId,
      }));
    },
    [],
  );

  const setMajorSkill = useCallback(
    (columnId: BranchColumnId, level: number, skillId: string | null) => {
      setSelectedMajorSkills((current) => {
        const key = getMajorSkillKey(columnId, level);

        if (!skillId) {
          const { [key]: _removedSkill, ...remainingSkills } = current;
          return remainingSkills;
        }

        return {
          ...current,
          [key]: skillId,
        };
      });
    },
    [],
  );

  const getMajorSkill = useCallback(
    (columnId: BranchColumnId, level: number) =>
      selectedMajorSkills[getMajorSkillKey(columnId, level)] ?? null,
    [selectedMajorSkills],
  );

  const cycleWeaponAwakeningSlot = useCallback(
    (slot: number) => {
      setWeaponAwakeningSelections((current) => ({
        ...current,
        [slot]: getNextWeaponAwakeningColor(
          current[slot] ?? null,
          weaponAwakeningCatalog.colors,
        ),
      }));
    },
    [weaponAwakeningCatalog.colors],
  );

  const buildWeaponAwakening = useCallback(
    () =>
      buildWeaponAwakeningSlots(
        weaponAwakeningCatalog.slots,
        weaponAwakeningSelections,
      ),
    [weaponAwakeningCatalog.slots, weaponAwakeningSelections],
  );

  const addArtifact = useCallback((id: string) => {
    setSelectedArtifactIds((current) => {
      if (current.includes(id)) {
        return current;
      }

      return [...current, id];
    });
  }, []);

  const removeArtifact = useCallback((id: string) => {
    setSelectedArtifactIds((current) => current.filter((artifactId) => artifactId !== id));
  }, []);

  const addRune = useCallback((id: string) => {
    setSelectedRuneIds((current) => {
      if (current.includes(id)) {
        return current;
      }

      return [...current, id];
    });
  }, []);

  const removeRune = useCallback((id: string) => {
    setSelectedRuneIds((current) => current.filter((runeId) => runeId !== id));
  }, []);

  // Текущий выбор экипировки (артефакты + руны) для выгрузки в JSON
  const buildEquipment = useCallback(
    (): EquipmentVariantSelection => ({
      artifactIds: selectedArtifactIds,
      runeIds: selectedRuneIds,
    }),
    [selectedArtifactIds, selectedRuneIds],
  );

  // Установить прогресс столбца точно до уровня (null — снять)
  const setColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number | null) => {
      setProgressLevels((current) => {
        const next = { ...current };

        if (level === null) {
          delete next[columnId];
        } else {
          next[columnId] = level;
        }

        return next;
      });
    },
    [],
  );

  // Клик по ноде: до неё — активна; повторный клик по верхней — откат на ноду ниже
  const toggleColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number) => {
      setProgressLevels((current) => {
        const next = { ...current };

        if (current[columnId] === level) {
          const previous = getPreviousNodeLevel(columnId, level);

          if (previous === null) {
            delete next[columnId];
          } else {
            next[columnId] = previous;
          }
        } else {
          next[columnId] = level;
        }

        return next;
      });
    },
    [],
  );

  // Откат прогресса столбца на ноду ниже переданного уровня (при сбросе мажорной ноды)
  const rollbackColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number) => {
      setColumnProgress(columnId, getPreviousNodeLevel(columnId, level));
    },
    [setColumnProgress],
  );

  const buildValidationDraft =
    useCallback((): DivinityBranchBuildValidationDraft => {
      return {
        gameMode,
        heroName,
        columns: selectedBranches,
        majorNodes: buildMajorNodes(selectedBranches, selectedMajorSkills),
        weaponAwakening: buildWeaponAwakening(),
        equipment: buildEquipment(),
      };
    }, [
      buildEquipment,
      buildWeaponAwakening,
      gameMode,
      heroName,
      selectedBranches,
      selectedMajorSkills,
    ]);

  const buildExport = useCallback(
    (createdAt = new Date().toISOString()): DivinityBranchBuilderExport | null => {
      const resolvedGameMode = getGameModeForPath(buildTargetTabs, targetTabPath);

      if (!resolvedGameMode) {
        return null;
      }

      if (!hasSelectedAllBranches(selectedBranches)) {
        return null;
      }

      const majorNodes = buildMajorNodes(selectedBranches, selectedMajorSkills);
      const weaponAwakening = buildWeaponAwakening();

      if (majorNodes.length !== getMajorSlotCount()) {
        return null;
      }

      if (weaponAwakening.length !== weaponAwakeningCatalog.slots.length) {
        return null;
      }

      return {
        schemaVersion: 1,
        gameMode: resolvedGameMode,
        heroName,
        targetTabPath,
        columns: selectedBranches,
        majorNodes,
        weaponAwakening,
        equipment: buildEquipment(),
        progress: progressLevels,
        activeNodes: buildActiveNodes(progressLevels),
        metadata: {
          createdAt,
          source: "manual-branch-builder",
        },
      };
    },
    [
      buildEquipment,
      buildWeaponAwakening,
      gameMode,
      heroName,
      selectedBranches,
      selectedMajorSkills,
      progressLevels,
      targetTabPath,
      weaponAwakeningCatalog.slots.length,
    ],
  );

  return useMemo(
    () => ({
      gameMode,
      targetTabPath,
      heroName,
      selectedBranches,
      selectedMajorSkills,
      weaponAwakeningSelections,
      selectedArtifactIds,
      selectedRuneIds,
      progressLevels,
      setTargetTopTab,
      setTargetChildTab,
      setHeroName,
      cycleWeaponAwakeningSlot,
      addArtifact,
      removeArtifact,
      addRune,
      removeRune,
      setColumnBranch,
      setMajorSkill,
      getMajorSkill,
      setColumnProgress,
      toggleColumnProgress,
      rollbackColumnProgress,
      buildValidationDraft,
      buildExport,
    }),
    [
      buildValidationDraft,
      buildExport,
      cycleWeaponAwakeningSlot,
      gameMode,
      getMajorSkill,
      heroName,
      progressLevels,
      rollbackColumnProgress,
      selectedBranches,
      selectedMajorSkills,
      targetTabPath,
      weaponAwakeningSelections,
      selectedArtifactIds,
      selectedRuneIds,
      setColumnBranch,
      setColumnProgress,
      setTargetTopTab,
      setTargetChildTab,
      setMajorSkill,
      toggleColumnProgress,
    ],
  );
}

function getMajorSkillKey(columnId: BranchColumnId, level: number): string {
  return `${columnId}:${level}`;
}

// Все активные ноды: в каждом столбце — все ноды с уровнем не выше прогресса
function buildActiveNodes(
  progressLevels: BranchProgressLevels,
): ActiveBranchNode[] {
  const activeNodes: ActiveBranchNode[] = [];

  columnIds.forEach((columnId) => {
    const progress = progressLevels[columnId];

    if (progress === undefined) {
      return;
    }

    (columnNodeLevels[columnId] ?? [])
      .filter((level) => level <= progress)
      .forEach((level) => activeNodes.push({ columnId, level }));
  });

  return activeNodes;
}

function hasSelectedAllBranches(
  selectedBranches: DraftBranchColumns,
): selectedBranches is Record<BranchColumnId, DivinityBranchId> {
  return columnIds.every((columnId) => selectedBranches[columnId] !== null);
}

function buildMajorNodes(
  selectedBranches: DraftBranchColumns,
  selectedMajorSkills: MajorSkillSelections,
): DivinityBranchBuildMajorNode[] {
  return template
    .filter((node) => node.nodeType === "majorSkill")
    .map((node) => {
      const columnId = node.columnId as BranchColumnId;
      const branchId = selectedBranches[columnId];
      const skillId = selectedMajorSkills[getMajorSkillKey(columnId, node.level)];

      if (!branchId || !skillId) {
        return null;
      }

      return {
        level: node.level,
        columnId,
        branchId,
        skillId,
      };
    })
    .filter((node): node is DivinityBranchBuildMajorNode => node !== null);
}

function getMajorSlotCount(): number {
  return template.filter((node) => node.nodeType === "majorSkill").length;
}
