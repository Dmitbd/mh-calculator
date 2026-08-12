import { useCallback, useMemo, useState } from "react";

import { getHeroById } from "@/features/game-data/heroes";
import { compactDivinitySkillIds } from "@/features/game-data/divinity";

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
  DivinitySkillLoadout,
  DivinitySkillLoadoutDraft,
  DivinitySkillLoadoutRowId,
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
  type HeroBuildSet,
  type HeroBuildTab,
} from "@/features/game-data/heroes";

type MajorSkillSelections = Partial<Record<string, string>>;
type WeaponAwakeningSelections = Partial<Record<number, WeaponAwakeningColorId>>;
type EditableBuildDraft = {
  selectedBranches: DraftBranchColumns;
  selectedMajorSkills: MajorSkillSelections;
  selectedDivinitySkills: DivinitySkillLoadoutDraft;
  weaponAwakeningSelections: WeaponAwakeningSelections;
  selectedArtifactIds: string[];
  selectedRuneIds: string[];
  progressLevels: BranchProgressLevels;
};
type DraftsByPath = Record<string, EditableBuildDraft>;

export type PreparedTargetBuildSave = {
  buildSet: HeroBuildSet;
  exported: DivinityBranchBuilderExport;
  nextSavedBuilds: SavedBuildsByPath;
};

const emptySelectedBranches: DraftBranchColumns = {
  left: null,
  center: null,
  right: null,
};
const emptySelectedDivinitySkills: DivinitySkillLoadoutDraft = {
  base: [],
  awakened: [],
  awakenedEnabled: false,
};
const emptyDraft: EditableBuildDraft = {
  selectedBranches: emptySelectedBranches,
  selectedMajorSkills: {},
  selectedDivinitySkills: emptySelectedDivinitySkills,
  weaponAwakeningSelections: {},
  selectedArtifactIds: [],
  selectedRuneIds: [],
  progressLevels: {},
};

const columnIds: BranchColumnId[] = ["left", "center", "right"];

function createEmptyDivinitySkillDraft(): DivinitySkillLoadoutDraft {
  return {
    base: [],
    awakened: [],
    awakenedEnabled: false,
  };
}

function clearMajorSkillsForColumn(
  selectedMajorSkills: MajorSkillSelections,
  columnId: BranchColumnId,
): MajorSkillSelections {
  return Object.fromEntries(
    Object.entries(selectedMajorSkills).filter(
      ([key]) => !key.startsWith(`${columnId}:`),
    ),
  );
}

function clearProgressForColumn(
  progressLevels: BranchProgressLevels,
  columnId: BranchColumnId,
): BranchProgressLevels {
  const { [columnId]: _removedProgress, ...remainingProgress } = progressLevels;

  return remainingProgress;
}

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
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const selectedHero = selectedHeroId ? getHeroById(selectedHeroId) : null;
  const heroName = selectedHero?.name.ru ?? "";
  const [draftsByPath, setDraftsByPath] = useState<DraftsByPath>({});
  const [savedBuildsByPath, setSavedBuildsByPath] = useState<SavedBuildsByPath>({});
  const targetPathKey = getBuildTargetPathKey(targetTabPath);
  const currentDraft = draftsByPath[targetPathKey] ?? emptyDraft;
  const {
    progressLevels,
    selectedArtifactIds,
    selectedBranches,
    selectedDivinitySkills,
    selectedMajorSkills,
    selectedRuneIds,
    weaponAwakeningSelections,
  } = currentDraft;

  const updateCurrentDraft = useCallback(
    (update: (current: EditableBuildDraft) => EditableBuildDraft) => {
      setSavedBuildsByPath((savedBuilds) => {
        const { [targetPathKey]: _changedBuild, ...remainingBuilds } = savedBuilds;

        return remainingBuilds;
      });
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

  const selectHero = useCallback((heroId: string) => {
    const hero = getHeroById(heroId);

    if (!hero) {
      return;
    }

    if (selectedHeroId !== heroId) {
      setSavedBuildsByPath({});
    }

    setSelectedHeroId(heroId);
  }, [selectedHeroId]);

  const setColumnBranch = useCallback(
    (columnId: BranchColumnId, branchId: DivinityBranchId | null) => {
      updateCurrentDraft((current) => {
        if (
          isBranchSelectedInAnotherColumn(
            current.selectedBranches,
            columnId,
            branchId,
          )
        ) {
          return current;
        }

        const branchChanged = current.selectedBranches[columnId] !== branchId;

        return {
          ...current,
          selectedBranches: {
            ...current.selectedBranches,
            [columnId]: branchId,
          },
          selectedMajorSkills: branchChanged
            ? clearMajorSkillsForColumn(current.selectedMajorSkills, columnId)
            : current.selectedMajorSkills,
          selectedDivinitySkills:
            branchChanged
              ? createEmptyDivinitySkillDraft()
              : current.selectedDivinitySkills,
          progressLevels: branchChanged
            ? clearProgressForColumn(current.progressLevels, columnId)
            : current.progressLevels,
        };
      });
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

  const setDivinitySkill = useCallback(
    (
      rowId: DivinitySkillLoadoutRowId,
      slotIndex: number,
      skillId: string | null,
    ) => {
      updateCurrentDraft((current) => ({
        ...current,
        selectedDivinitySkills: {
          ...current.selectedDivinitySkills,
          [rowId]: setArraySlot(
            current.selectedDivinitySkills[rowId],
            slotIndex,
            skillId,
          ),
        },
      }));
    },
    [updateCurrentDraft],
  );

  const showAwakenedDivinitySkills = useCallback(() => {
    updateCurrentDraft((current) => ({
      ...current,
      selectedDivinitySkills: {
        ...current.selectedDivinitySkills,
        awakenedEnabled: true,
      },
    }));
  }, [updateCurrentDraft]);

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

  const buildDivinitySkills = useCallback(
    (): DivinitySkillLoadout => {
      const base = compactDivinitySkillIds(selectedDivinitySkills.base);
      const awakened = selectedDivinitySkills.awakenedEnabled
        ? compactDivinitySkillIds(selectedDivinitySkills.awakened)
        : [];

      return awakened.length > 0
        ? { base, awakened }
        : { base };
    },
    [selectedDivinitySkills],
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
        divinitySkills: buildDivinitySkills(),
        weaponAwakening: buildWeaponAwakening(),
        equipment: buildEquipment(),
        progress: progressLevels,
      };
    }, [
      buildEquipment,
      buildDivinitySkills,
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
        divinitySkills: buildDivinitySkills(),
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
      buildDivinitySkills,
      buildWeaponAwakening,
      selectedBranches,
      selectedMajorSkills,
      progressLevels,
      selectedHeroId,
      targetTabPath,
      weaponAwakeningCatalog.slots.length,
    ],
  );

  const prepareCurrentTargetBuild = useCallback(
    (createdAt?: string): PreparedTargetBuildSave | null => {
      const exported = buildExport(createdAt);
      if (!exported) return null;

      const nextSavedBuilds = {
        ...savedBuildsByPath,
        [getBuildTargetPathKey(targetTabPath)]: toCommittedBuild(exported),
      };

      return {
        buildSet: buildHeroBuildSetFromSavedBuilds(
          buildTargetTabs,
          nextSavedBuilds,
        ),
        exported,
        nextSavedBuilds,
      };
    },
    [buildExport, savedBuildsByPath, targetTabPath],
  );

  const commitPreparedTargetBuild = useCallback(
    (prepared: PreparedTargetBuildSave) => {
      setSavedBuildsByPath(prepared.nextSavedBuilds);
      setDraftsByPath((current) => seedEmptyDrafts(current, prepared.exported));
    },
    [],
  );

  const saveCurrentTargetBuild = useCallback(
    (createdAt?: string) => {
      const prepared = prepareCurrentTargetBuild(createdAt);

      if (!prepared) {
        return false;
      }

      commitPreparedTargetBuild(prepared);

      return true;
    },
    [commitPreparedTargetBuild, prepareCurrentTargetBuild],
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

  const loadBuildSetForEditing = useCallback((buildSet: HeroBuildSet) => {
    const loadedBuilds = extractSavedBuildsFromTabs(buildSet.tabs);
    const entries = Object.entries(loadedBuilds);
    const firstBuild = entries[0]?.[1];
    const hero = firstBuild ? getHeroById(firstBuild.heroId) : null;

    if (!firstBuild || !hero) {
      return false;
    }

    const loadedDrafts = entries.reduce<DraftsByPath>((drafts, [key, build]) => {
      return {
        ...drafts,
        [key]: exportToEditableDraft({
          ...build,
          targetTabPath: key.split("/"),
        }),
      };
    }, {});

    setSelectedHeroId(hero.id);
    setSavedBuildsByPath(loadedBuilds);
    setDraftsByPath(loadedDrafts);
    setTargetTabPath(entries[0][0].split("/"));

    return true;
  }, []);

  return useMemo(
    () => ({
      gameMode,
      targetTabPath,
      selectedHeroId,
      selectedHero,
      heroName,
      selectedBranches,
      selectedMajorSkills,
      selectedDivinitySkills,
      weaponAwakeningSelections,
      selectedArtifactIds,
      selectedRuneIds,
      progressLevels,
      savedBuildsByPath,
      setTargetTopTab,
      setTargetChildTab,
      selectHero,
      cycleWeaponAwakeningSlot,
      addArtifact,
      removeArtifact,
      addRune,
      removeRune,
      setColumnBranch,
      setMajorSkill,
      getMajorSkill,
      setDivinitySkill,
      showAwakenedDivinitySkills,
      setColumnProgress,
      toggleColumnProgress,
      rollbackColumnProgress,
      buildValidationDraft,
      buildExport,
      loadBuildSetForEditing,
      prepareCurrentTargetBuild,
      commitPreparedTargetBuild,
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
      progressLevels,
      rollbackColumnProgress,
      selectedHero,
      selectedHeroId,
      selectedBranches,
      selectedDivinitySkills,
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
      setDivinitySkill,
      showAwakenedDivinitySkills,
      toggleColumnProgress,
      loadBuildSetForEditing,
      prepareCurrentTargetBuild,
      commitPreparedTargetBuild,
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

function extractSavedBuildsFromTabs(
  tabs: readonly HeroBuildTab[],
  parentPath: HeroBuildTargetTabPath = [],
): SavedBuildsByPath {
  return tabs.reduce<SavedBuildsByPath>((savedBuilds, tab) => {
    const path = [...parentPath, tab.id];

    if (tab.kind === "group" && tab.children) {
      return {
        ...savedBuilds,
        ...extractSavedBuildsFromTabs(tab.children, path),
      };
    }

    if (!tab.build) {
      return savedBuilds;
    }

    return {
      ...savedBuilds,
      [getBuildTargetPathKey(path)]: tab.build,
    };
  }, {});
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
    selectedDivinitySkills: exportDivinitySkillsToEditableDraft(
      exported.divinitySkills,
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
    selectedDivinitySkills: {
      base: [...draft.selectedDivinitySkills.base],
      awakened: [...draft.selectedDivinitySkills.awakened],
      awakenedEnabled: draft.selectedDivinitySkills.awakenedEnabled,
    },
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
    draft.selectedDivinitySkills.base.length === 0 &&
    draft.selectedDivinitySkills.awakened.length === 0 &&
    !draft.selectedDivinitySkills.awakenedEnabled &&
    Object.keys(draft.weaponAwakeningSelections).length === 0 &&
    draft.selectedArtifactIds.length === 0 &&
    draft.selectedRuneIds.length === 0 &&
    Object.keys(draft.progressLevels).length === 0
  );
}

function getMajorSkillKey(columnId: BranchColumnId, level: number): string {
  return `${columnId}:${level}`;
}

function setArraySlot<T>(
  values: readonly T[],
  index: number,
  value: T,
): T[] {
  const nextValues = [...values];
  nextValues[index] = value;

  return nextValues;
}

function exportDivinitySkillsToEditableDraft(
  divinitySkills: DivinitySkillLoadout | undefined,
): DivinitySkillLoadoutDraft {
  return {
    base: [...(divinitySkills?.base ?? [])],
    awakened: [...(divinitySkills?.awakened ?? [])],
    awakenedEnabled: Boolean(divinitySkills?.awakened),
  };
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

function isBranchSelectedInAnotherColumn(
  selectedBranches: DraftBranchColumns,
  columnId: BranchColumnId,
  branchId: DivinityBranchId | null,
): boolean {
  if (!branchId) {
    return false;
  }

  return columnIds.some(
    (otherColumnId) =>
      otherColumnId !== columnId && selectedBranches[otherColumnId] === branchId,
  );
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
