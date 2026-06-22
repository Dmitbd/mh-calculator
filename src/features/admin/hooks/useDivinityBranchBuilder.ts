import { useCallback, useMemo, useState } from "react";

import { getHeroById } from "@/features/game-data/heroes";

import { branchBuilderTemplate as template } from "../data/branchBuilderCatalogs";
import {
  buildTargetTabs,
  defaultBuildTargetTabPath,
} from "../data/buildTargetTabs";
import { branchBuilderValidationCatalog } from "../data/branchBuilderCatalogs";
import {
  buildHeroBuildSetFromSavedBuilds,
  getBuildTargetLeafTabs,
  getBuildTargetPathKey,
  validateMultiBuildExport,
  type SavedBuildsByPath,
} from "../model/multiBuildExport";
import type {
  ActiveBranchNode,
  BranchColumnId,
  BranchProgressLevels,
  DivinityBranchBuilderExport,
  DivinityBranchBuildExport,
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
} from "@/features/game-data/heroes";

type MajorSkillSelections = Partial<Record<string, string>>;
type WeaponAwakeningSelections = Partial<Record<number, WeaponAwakeningColorId>>;
type EditableBuildDraft = {
  selectedBranches: DraftBranchColumns;
  selectedMajorSkills: MajorSkillSelections;
  weaponAwakeningSelections: WeaponAwakeningSelections;
  selectedArtifactIds: string[];
  selectedRuneIds: string[];
  progressLevels: BranchProgressLevels;
};
type DraftsByPath = Record<string, EditableBuildDraft>;

const emptySelectedBranches: DraftBranchColumns = {
  left: null,
  center: null,
  right: null,
};
const emptyDraft: EditableBuildDraft = {
  selectedBranches: emptySelectedBranches,
  selectedMajorSkills: {},
  weaponAwakeningSelections: {},
  selectedArtifactIds: [],
  selectedRuneIds: [],
  progressLevels: {},
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
  const [heroQuery, setHeroQueryState] = useState("");
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const selectedHero = selectedHeroId ? getHeroById(selectedHeroId) : null;
  const heroName = selectedHero?.name.ru ?? heroQuery;
  const [draftsByPath, setDraftsByPath] = useState<DraftsByPath>({});
  const [savedBuildsByPath, setSavedBuildsByPath] = useState<SavedBuildsByPath>({});
  const targetPathKey = getBuildTargetPathKey(targetTabPath);
  const currentDraft = draftsByPath[targetPathKey] ?? emptyDraft;
  const {
    progressLevels,
    selectedArtifactIds,
    selectedBranches,
    selectedMajorSkills,
    selectedRuneIds,
    weaponAwakeningSelections,
  } = currentDraft;

  const updateCurrentDraft = useCallback(
    (update: (current: EditableBuildDraft) => EditableBuildDraft) => {
      setDraftsByPath((current) => {
        const draft = current[targetPathKey] ?? emptyDraft;

        return {
          ...current,
          [targetPathKey]: update(cloneDraft(draft)),
        };
      });
    },
    [targetPathKey],
  );

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

  const setHeroQuery = useCallback((value: string) => {
    setHeroQueryState(value);
    setSelectedHeroId((currentId) => {
      if (!currentId) {
        return null;
      }

      const hero = getHeroById(currentId);

      if (!hero || value !== hero.name.ru) {
        return null;
      }

      return currentId;
    });
  }, []);

  const selectHero = useCallback((heroId: string) => {
    const hero = getHeroById(heroId);

    if (!hero) {
      return;
    }

    setSelectedHeroId(heroId);
    setHeroQueryState(hero.name.ru);
  }, []);

  const clearSelectedHero = useCallback(() => {
    setSelectedHeroId(null);
    setHeroQueryState("");
  }, []);

  const setColumnBranch = useCallback(
    (columnId: BranchColumnId, branchId: DivinityBranchId | null) => {
      updateCurrentDraft((current) => ({
        ...current,
        selectedBranches: {
          ...current.selectedBranches,
          [columnId]: branchId,
        },
      }));
    },
    [updateCurrentDraft],
  );

  const setMajorSkill = useCallback(
    (columnId: BranchColumnId, level: number, skillId: string | null) => {
      updateCurrentDraft((current) => {
        const key = getMajorSkillKey(columnId, level);

        if (!skillId) {
          const { [key]: _removedSkill, ...remainingSkills } =
            current.selectedMajorSkills;

          return {
            ...current,
            selectedMajorSkills: remainingSkills,
          };
        }

        return {
          ...current,
          selectedMajorSkills: {
            ...current.selectedMajorSkills,
            [key]: skillId,
          },
        };
      });
    },
    [updateCurrentDraft],
  );

  const getMajorSkill = useCallback(
    (columnId: BranchColumnId, level: number) =>
      selectedMajorSkills[getMajorSkillKey(columnId, level)] ?? null,
    [selectedMajorSkills],
  );

  const cycleWeaponAwakeningSlot = useCallback(
    (slot: number) => {
      updateCurrentDraft((current) => ({
        ...current,
        weaponAwakeningSelections: {
          ...current.weaponAwakeningSelections,
          [slot]: getNextWeaponAwakeningColor(
            current.weaponAwakeningSelections[slot] ?? null,
            weaponAwakeningCatalog.colors,
          ),
        },
      }));
    },
    [updateCurrentDraft, weaponAwakeningCatalog.colors],
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
    updateCurrentDraft((current) => {
      if (current.selectedArtifactIds.includes(id)) {
        return current;
      }

      return {
        ...current,
        selectedArtifactIds: [...current.selectedArtifactIds, id],
      };
    });
  }, [updateCurrentDraft]);

  const removeArtifact = useCallback((id: string) => {
    updateCurrentDraft((current) => ({
      ...current,
      selectedArtifactIds: current.selectedArtifactIds.filter(
        (artifactId) => artifactId !== id,
      ),
    }));
  }, [updateCurrentDraft]);

  const addRune = useCallback((id: string) => {
    updateCurrentDraft((current) => {
      if (current.selectedRuneIds.includes(id)) {
        return current;
      }

      return {
        ...current,
        selectedRuneIds: [...current.selectedRuneIds, id],
      };
    });
  }, [updateCurrentDraft]);

  const removeRune = useCallback((id: string) => {
    updateCurrentDraft((current) => ({
      ...current,
      selectedRuneIds: current.selectedRuneIds.filter((runeId) => runeId !== id),
    }));
  }, [updateCurrentDraft]);

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
      updateCurrentDraft((current) => {
        const nextProgress = { ...current.progressLevels };

        if (level === null) {
          delete nextProgress[columnId];
        } else {
          nextProgress[columnId] = level;
        }

        return {
          ...current,
          progressLevels: nextProgress,
        };
      });
    },
    [updateCurrentDraft],
  );

  // Клик по ноде: до неё — активна; повторный клик по верхней — откат на ноду ниже
  const toggleColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number) => {
      updateCurrentDraft((current) => {
        const nextProgress = { ...current.progressLevels };

        if (current.progressLevels[columnId] === level) {
          const previous = getPreviousNodeLevel(columnId, level);

          if (previous === null) {
            delete nextProgress[columnId];
          } else {
            nextProgress[columnId] = previous;
          }
        } else {
          nextProgress[columnId] = level;
        }

        return {
          ...current,
          progressLevels: nextProgress,
        };
      });
    },
    [updateCurrentDraft],
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
        heroId: selectedHeroId,
        heroName,
        columns: selectedBranches,
        majorNodes: buildMajorNodes(selectedBranches, selectedMajorSkills),
        weaponAwakening: buildWeaponAwakening(),
        equipment: buildEquipment(),
        progress: progressLevels,
      };
    }, [
      buildEquipment,
      buildWeaponAwakening,
      gameMode,
      heroName,
      progressLevels,
      selectedHeroId,
      selectedBranches,
      selectedMajorSkills,
    ]);

  const buildExport = useCallback(
    (createdAt = new Date().toISOString()): DivinityBranchBuilderExport | null => {
      const resolvedGameMode = getGameModeForPath(buildTargetTabs, targetTabPath);

      if (!resolvedGameMode) {
        return null;
      }

      const catalogHero = selectedHeroId ? getHeroById(selectedHeroId) : null;

      if (!catalogHero) {
        return null;
      }

      const equipment = buildEquipment();

      if (equipment.artifactIds.length === 0 || equipment.runeIds.length === 0) {
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
        heroId: catalogHero.id,
        heroName: catalogHero.name.ru,
        targetTabPath,
        columns: selectedBranches,
        majorNodes,
        weaponAwakening,
        equipment,
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
      selectedBranches,
      selectedMajorSkills,
      progressLevels,
      selectedHeroId,
      targetTabPath,
      weaponAwakeningCatalog.slots.length,
    ],
  );

  const saveCurrentTargetBuild = useCallback(
    (createdAt?: string) => {
      const exported = buildExport(createdAt);

      if (!exported) {
        return false;
      }

      const key = getBuildTargetPathKey(targetTabPath);

      setSavedBuildsByPath((current) => ({
        ...seedEmptySavedBuilds(current, exported),
        [key]: toCommittedBuild(exported),
      }));
      setDraftsByPath((current) => seedEmptyDrafts(current, exported));

      return true;
    },
    [buildExport, targetTabPath],
  );

  const validateFullExport = useCallback(
    () =>
      validateMultiBuildExport({
        targetTabs: buildTargetTabs,
        savedBuilds: savedBuildsByPath,
        validationCatalog: branchBuilderValidationCatalog,
      }),
    [savedBuildsByPath],
  );

  const buildFullExport = useCallback(() => {
    const result = validateFullExport();

    if (!result.isValid) {
      return null;
    }

    return buildHeroBuildSetFromSavedBuilds(buildTargetTabs, savedBuildsByPath);
  }, [savedBuildsByPath, validateFullExport]);

  return useMemo(
    () => ({
      gameMode,
      targetTabPath,
      heroQuery,
      selectedHeroId,
      selectedHero,
      heroName,
      selectedBranches,
      selectedMajorSkills,
      weaponAwakeningSelections,
      selectedArtifactIds,
      selectedRuneIds,
      progressLevels,
      savedBuildsByPath,
      setTargetTopTab,
      setTargetChildTab,
      setHeroQuery,
      selectHero,
      clearSelectedHero,
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
      saveCurrentTargetBuild,
      validateFullExport,
      buildFullExport,
    }),
    [
      buildValidationDraft,
      buildExport,
      cycleWeaponAwakeningSlot,
      gameMode,
      getMajorSkill,
      heroName,
      heroQuery,
      progressLevels,
      rollbackColumnProgress,
      selectedHero,
      selectedHeroId,
      selectedBranches,
      selectedMajorSkills,
      targetTabPath,
      weaponAwakeningSelections,
      selectedArtifactIds,
      selectedRuneIds,
      savedBuildsByPath,
      setColumnBranch,
      setColumnProgress,
      setTargetTopTab,
      setTargetChildTab,
      setMajorSkill,
      toggleColumnProgress,
      saveCurrentTargetBuild,
      validateFullExport,
      buildFullExport,
    ],
  );
}

function toCommittedBuild(
  exported: DivinityBranchBuilderExport,
): DivinityBranchBuildExport {
  const { targetTabPath: _targetTabPath, ...build } = exported;
  return build;
}

function seedEmptySavedBuilds(
  current: SavedBuildsByPath,
  exported: DivinityBranchBuilderExport,
): SavedBuildsByPath {
  if (Object.keys(current).length > 0) {
    return current;
  }

  return getBuildTargetLeafTabs(buildTargetTabs).reduce<SavedBuildsByPath>(
    (seededBuilds, leaf) => {
      seededBuilds[getBuildTargetPathKey(leaf.path)] = {
        ...toCommittedBuild(exported),
        gameMode: leaf.gameMode,
      };

      return seededBuilds;
    },
    {},
  );
}

function seedEmptyDrafts(
  current: DraftsByPath,
  exported: DivinityBranchBuilderExport,
): DraftsByPath {
  const seededDraft = exportToEditableDraft(exported);

  return getBuildTargetLeafTabs(buildTargetTabs).reduce<DraftsByPath>(
    (drafts, leaf) => {
      const key = getBuildTargetPathKey(leaf.path);
      const existingDraft = drafts[key];

      if (existingDraft && !isEmptyDraft(existingDraft)) {
        return drafts;
      }

      return {
        ...drafts,
        [key]: cloneDraft(seededDraft),
      };
    },
    current,
  );
}

function exportToEditableDraft(
  exported: DivinityBranchBuilderExport,
): EditableBuildDraft {
  return {
    selectedBranches: { ...exported.columns },
    selectedMajorSkills: Object.fromEntries(
      exported.majorNodes.map((node) => [
        getMajorSkillKey(node.columnId, node.level),
        node.skillId,
      ]),
    ),
    weaponAwakeningSelections: Object.fromEntries(
      exported.weaponAwakening.map((entry) => [entry.slot, entry.colorId]),
    ),
    selectedArtifactIds: [...exported.equipment.artifactIds],
    selectedRuneIds: [...exported.equipment.runeIds],
    progressLevels: { ...exported.progress },
  };
}

function cloneDraft(draft: EditableBuildDraft): EditableBuildDraft {
  return {
    selectedBranches: { ...draft.selectedBranches },
    selectedMajorSkills: { ...draft.selectedMajorSkills },
    weaponAwakeningSelections: { ...draft.weaponAwakeningSelections },
    selectedArtifactIds: [...draft.selectedArtifactIds],
    selectedRuneIds: [...draft.selectedRuneIds],
    progressLevels: { ...draft.progressLevels },
  };
}

function isEmptyDraft(draft: EditableBuildDraft): boolean {
  return (
    columnIds.every((columnId) => draft.selectedBranches[columnId] === null) &&
    Object.keys(draft.selectedMajorSkills).length === 0 &&
    Object.keys(draft.weaponAwakeningSelections).length === 0 &&
    draft.selectedArtifactIds.length === 0 &&
    draft.selectedRuneIds.length === 0 &&
    Object.keys(draft.progressLevels).length === 0
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
