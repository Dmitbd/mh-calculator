import { useCallback, useMemo, useRef, useState } from "react";

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
import {
  buildPublishedBuilderBuildSet,
  buildExportFromEditable,
  buildValidationDraftFromEditable,
  cloneEditableBuildDraft,
  createPublishedBuilderEditState,
  exportToEditableDraft,
  extractBuildsFromTabs,
  getFirstInvalidPublishedBuild,
  isPublishedBuilderDirty,
  resetPublishedBuilderBaseline,
  validatePublishedBuilderDrafts,
  type DraftsByPath,
  type EditableBuildDraft,
  type MajorSkillSelections,
  type WeaponAwakeningSelections,
} from "../model/publishedBuilderEditModel";
import type {
  BranchColumnId,
  BranchProgressLevels,
  DivinityBranchBuilderExport,
  DivinityBranchBuildExport,
  DivinityBranchBuildValidationDraft,
  DivinityBranchId,
  DivinitySkillLoadoutDraft,
  DivinitySkillLoadoutRowId,
  DraftBranchColumns,
  HeroBuildTargetTabPath,
  WeaponAwakeningColor,
  WeaponAwakeningSlot,
} from "../types/admin.types";
import {
  getNextWeaponAwakeningColor,
} from "../utils/weaponAwakening";
import {
  getGameModeForPath,
  getTabByPath,
  sortBuildTabs,
  type HeroBuildSet,
} from "@/features/game-data/heroes";
import { validateBranchBuild } from "../utils/validateBranchBuild";

type BuilderMode = "create" | "edit";

export type PreparedTargetBuildSave = {
  buildSet: HeroBuildSet;
  exported: DivinityBranchBuilderExport;
  nextSavedBuilds: SavedBuildsByPath;
  revision: number;
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
  options: { mode?: BuilderMode } = {},
) {
  const mode = options.mode ?? "create";
  const [targetTabPath, setTargetTabPath] =
    useState<HeroBuildTargetTabPath>(defaultTargetTabPath);
  const [publishedTargetTabs, setPublishedTargetTabs] = useState<
    HeroBuildSet["tabs"] | null
  >(null);
  const editorTargetTabs = publishedTargetTabs ?? buildTargetTabs;
  const gameMode =
    getGameModeForPath(editorTargetTabs, targetTabPath) ??
    getGameModeForPath(buildTargetTabs, defaultTargetTabPath) ??
    buildTargetTabs[0]?.gameMode ??
    "pvp";
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const selectedHeroIdRef = useRef<string | null>(null);
  const selectedHero = selectedHeroId ? getHeroById(selectedHeroId) : null;
  const heroName = selectedHero?.name.ru ?? "";
  const [draftsByPath, setDraftsByPath] = useState<DraftsByPath>({});
  const [savedBuildsByPath, setSavedBuildsByPath] = useState<SavedBuildsByPath>({});
  const [publishedBaselineBuildsByPath, setPublishedBaselineBuildsByPath] =
    useState<SavedBuildsByPath | null>(null);
  const contentRevisionRef = useRef(0);
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
      contentRevisionRef.current += 1;
      if (mode === "create") {
        setSavedBuildsByPath((savedBuilds) => {
          const { [targetPathKey]: _changedBuild, ...remainingBuilds } = savedBuilds;

          return remainingBuilds;
        });
      }
      setDraftsByPath((current) => {
        const draft = current[targetPathKey] ?? emptyDraft;

        return {
          ...current,
          [targetPathKey]: update(cloneEditableBuildDraft(draft)),
        };
      });
    },
    [mode, targetPathKey],
  );

  const setTargetTopTab = useCallback((topTabId: string) => {
    const tab = getTabByPath(editorTargetTabs, [topTabId]);

    if (!tab) {
      return;
    }

    if (tab.kind === "group" && tab.children && tab.children.length > 0) {
      const firstChild = sortBuildTabs(tab.children)[0];
      setTargetTabPath([topTabId, firstChild.id]);
      return;
    }

    setTargetTabPath([topTabId]);
  }, [editorTargetTabs]);

  const setTargetChildTab = useCallback((childTabId: string) => {
    setTargetTabPath((current) => [current[0], childTabId]);
  }, []);

  const selectTargetTabPath = useCallback(
    (path: HeroBuildTargetTabPath) => {
      const tab = getTabByPath(editorTargetTabs, path);

      if (!tab || tab.kind === "group") {
        return false;
      }

      setTargetTabPath([...path]);
      return true;
    },
    [editorTargetTabs],
  );

  const selectHero = useCallback((heroId: string) => {
    const hero = getHeroById(heroId);

    if (!hero) {
      return;
    }

    if (selectedHeroIdRef.current !== heroId) {
      contentRevisionRef.current += 1;
      setSavedBuildsByPath({});
      setPublishedBaselineBuildsByPath(null);
      setPublishedTargetTabs(null);
    }

    selectedHeroIdRef.current = heroId;
    setSelectedHeroId(heroId);
  }, []);

  const resetBuilderSession = useCallback(() => {
    contentRevisionRef.current += 1;
    selectedHeroIdRef.current = null;
    setSelectedHeroId(null);
    setDraftsByPath({});
    setSavedBuildsByPath({});
    setPublishedBaselineBuildsByPath(null);
    setPublishedTargetTabs(null);
    setTargetTabPath(defaultTargetTabPath);
  }, []);

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
      return buildValidationDraftFromEditable({
        draft: currentDraft,
        gameMode,
        heroId: selectedHeroId,
        heroName,
        weaponAwakeningCatalog,
      });
    }, [
      currentDraft,
      gameMode,
      heroName,
      selectedHeroId,
      weaponAwakeningCatalog,
    ]);

  const buildExport = useCallback(
    (createdAt = new Date().toISOString()): DivinityBranchBuilderExport | null => {
      return buildExportFromEditable({
        createdAt,
        draft: currentDraft,
        heroId: selectedHeroId,
        targetTabPath,
        targetTabs: editorTargetTabs,
        weaponAwakeningCatalog,
      });
    },
    [
      currentDraft,
      editorTargetTabs,
      selectedHeroId,
      targetTabPath,
      weaponAwakeningCatalog,
    ],
  );

  const buildCompletePublishedExport = useCallback(
    (createdAt = new Date().toISOString()) =>
      buildPublishedBuilderBuildSet({
        targetTabs: editorTargetTabs,
        draftsByPath,
        buildLeaf: (leaf, draft) => {
          const exported = buildExportFromEditable({
            createdAt,
            draft,
            heroId: selectedHeroId,
            targetTabPath: leaf.path,
            targetTabs: editorTargetTabs,
            weaponAwakeningCatalog,
          });

          return exported ? toCommittedBuild(exported) : null;
        },
      }),
    [
      draftsByPath,
      editorTargetTabs,
      selectedHeroId,
      weaponAwakeningCatalog,
    ],
  );

  const prepareCurrentTargetBuild = useCallback(
    (createdAt?: string): PreparedTargetBuildSave | null => {
      if (mode === "edit") {
        const buildSet = buildCompletePublishedExport(createdAt);

        if (!buildSet) {
          return null;
        }

        const nextSavedBuilds = extractBuildsFromTabs(buildSet.tabs);
        const currentBuild = nextSavedBuilds[targetPathKey];

        if (!currentBuild) {
          return null;
        }

        return {
          buildSet,
          exported: {
            ...currentBuild,
            targetTabPath: [...targetTabPath],
          },
          nextSavedBuilds,
          revision: contentRevisionRef.current,
        };
      }

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
        revision: contentRevisionRef.current,
      };
    },
    [
      buildCompletePublishedExport,
      buildExport,
      mode,
      savedBuildsByPath,
      targetPathKey,
      targetTabPath,
    ],
  );

  const commitPreparedTargetBuild = useCallback(
    (prepared: PreparedTargetBuildSave) => {
      if (prepared.exported.heroId !== selectedHeroIdRef.current) {
        return false;
      }

      if (prepared.revision !== contentRevisionRef.current) {
        if (mode === "edit") {
          setSavedBuildsByPath(prepared.nextSavedBuilds);
          setPublishedBaselineBuildsByPath(
            resetPublishedBuilderBaseline(prepared.nextSavedBuilds),
          );
        }

        return false;
      }

      contentRevisionRef.current += 1;
      setSavedBuildsByPath(prepared.nextSavedBuilds);
      if (mode === "edit") {
        setPublishedBaselineBuildsByPath(
          resetPublishedBuilderBaseline(prepared.nextSavedBuilds),
        );
        setDraftsByPath(
          Object.fromEntries(
            Object.entries(prepared.nextSavedBuilds).map(([key, build]) => [
              key,
              exportToEditableDraft(build),
            ]),
          ),
        );
      } else {
        setDraftsByPath((current) => seedEmptyDrafts(current, prepared.exported));
      }

      return true;
    },
    [mode],
  );

  const isPreparedTargetBuildCurrent = useCallback(
    (prepared: PreparedTargetBuildSave) =>
      prepared.revision + 1 === contentRevisionRef.current &&
      prepared.exported.heroId === selectedHeroIdRef.current,
    [],
  );

  const validateFullExport = useCallback(
    () => {
      if (mode === "edit" && publishedBaselineBuildsByPath) {
        return validatePublishedBuilderDrafts({
          targetTabs: editorTargetTabs,
          draftsByPath,
          validateLeaf: (leaf, draft) =>
            validateBranchBuild(
              buildValidationDraftFromEditable({
                draft,
                gameMode: leaf.gameMode,
                heroId: selectedHeroId,
                heroName,
                weaponAwakeningCatalog,
              }),
              branchBuilderValidationCatalog,
            ),
        });
      }

      return validateMultiBuildExport({
        targetTabs: buildTargetTabs,
        savedBuilds: savedBuildsByPath,
        validationCatalog: branchBuilderValidationCatalog,
      });
    },
    [
      draftsByPath,
      heroName,
      mode,
      publishedBaselineBuildsByPath,
      editorTargetTabs,
      savedBuildsByPath,
      selectedHeroId,
      weaponAwakeningCatalog,
    ],
  );

  const buildFullExport = useCallback((createdAt?: string) => {
    const result = validateFullExport();

    if (!result.isValid) {
      return null;
    }

    if (mode === "edit" && publishedBaselineBuildsByPath) {
      return buildCompletePublishedExport(createdAt);
    }

    return buildHeroBuildSetFromSavedBuilds(buildTargetTabs, savedBuildsByPath);
  }, [
    buildCompletePublishedExport,
    mode,
    publishedBaselineBuildsByPath,
    savedBuildsByPath,
    validateFullExport,
  ]);

  const loadBuildSetForEditing = useCallback((buildSet: HeroBuildSet) => {
    const publishedEditState =
      mode === "edit"
        ? createPublishedBuilderEditState(buildSet, buildTargetTabs)
        : null;

    if (mode === "edit" && !publishedEditState) {
      return false;
    }

    const loadedBuilds = publishedEditState?.baselineBuildsByPath ??
      extractBuildsFromTabs(buildSet.tabs);
    const entries = Object.entries(loadedBuilds);
    const firstBuild = entries[0]?.[1];
    const hero = firstBuild ? getHeroById(firstBuild.heroId) : null;

    if (!firstBuild || !hero) {
      return false;
    }

    const loadedDrafts = publishedEditState?.draftsByPath ??
      entries.reduce<DraftsByPath>((drafts, [key, build]) => ({
        ...drafts,
        [key]: exportToEditableDraft(build),
      }), {});

    contentRevisionRef.current += 1;
    selectedHeroIdRef.current = hero.id;
    setSelectedHeroId(hero.id);
    setSavedBuildsByPath(loadedBuilds);
    setDraftsByPath(loadedDrafts);
    setPublishedBaselineBuildsByPath(
      publishedEditState?.baselineBuildsByPath ?? null,
    );
    setPublishedTargetTabs(publishedEditState?.targetTabs ?? null);
    setTargetTabPath(
      publishedEditState?.firstTabPath ?? entries[0][0].split("/"),
    );

    return true;
  }, [mode]);

  const isDirty = useMemo(
    () =>
      mode === "edit" && publishedBaselineBuildsByPath
        ? isPublishedBuilderDirty(publishedBaselineBuildsByPath, draftsByPath)
        : false,
    [draftsByPath, mode, publishedBaselineBuildsByPath],
  );

  const getFirstInvalidFullExport = useCallback(
    (errors: Parameters<typeof getFirstInvalidPublishedBuild>[0]) =>
      getFirstInvalidPublishedBuild(errors, editorTargetTabs),
    [editorTargetTabs],
  );

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
      isDirty,
      editorTargetTabs,
      setTargetTopTab,
      setTargetChildTab,
      selectTargetTabPath,
      selectHero,
      resetBuilderSession,
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
      isPreparedTargetBuildCurrent,
      validateFullExport,
      buildFullExport,
      getFirstInvalidFullExport,
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
      isDirty,
      editorTargetTabs,
      setColumnBranch,
      setColumnProgress,
      setTargetTopTab,
      setTargetChildTab,
      selectTargetTabPath,
      resetBuilderSession,
      setMajorSkill,
      setDivinitySkill,
      showAwakenedDivinitySkills,
      toggleColumnProgress,
      loadBuildSetForEditing,
      prepareCurrentTargetBuild,
      commitPreparedTargetBuild,
      isPreparedTargetBuildCurrent,
      validateFullExport,
      buildFullExport,
      getFirstInvalidFullExport,
    ],
  );
}

function toCommittedBuild(
  exported: DivinityBranchBuilderExport,
): DivinityBranchBuildExport {
  const { targetTabPath: _targetTabPath, ...build } = exported;
  return build;
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
        [key]: cloneEditableBuildDraft(seededDraft),
      };
    },
    current,
  );
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
