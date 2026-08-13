import { useCallback, useMemo, useRef, useState } from "react";

import { getHeroById } from "@/features/game-data/heroes";

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
} from "../model/publishedBuilderEditModel";
import type {
  BranchColumnId,
  DivinityBranchBuilderExport,
  DivinityBranchBuildExport,
  DivinityBranchBuildValidationDraft,
  DivinityBranchId,
  DivinitySkillLoadoutRowId,
  HeroBuildTargetTabPath,
  WeaponAwakeningColor,
  WeaponAwakeningSlot,
} from "../types/admin.types";
import {
  getGameModeForPath,
  getTabByPath,
  sortBuildTabs,
  type HeroBuildSet,
} from "@/features/game-data/heroes";
import { validateBranchBuild } from "../utils/validateBranchBuild";
import {
  createEmptyEditableBuildDraft,
  reduceEditableBuildDraft,
  type BuilderEditorAction,
} from "../model/builderEditorReducer";

type BuilderMode = "create" | "edit";

export type PreparedTargetBuildSave = {
  buildSet: HeroBuildSet;
  exported: DivinityBranchBuilderExport;
  nextSavedBuilds: SavedBuildsByPath;
  revision: number;
};

const emptyDraft = createEmptyEditableBuildDraft();

const columnIds: BranchColumnId[] = ["left", "center", "right"];

/** Путь целевой вкладки по умолчанию — первая вкладка в buildTargetTabs */
const defaultTargetTabPath: HeroBuildTargetTabPath = defaultBuildTargetTabPath;

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

  const dispatchEditorAction = useCallback(
    (action: BuilderEditorAction) => {
      updateCurrentDraft((current) => reduceEditableBuildDraft(current, action));
    },
    [updateCurrentDraft],
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
      dispatchEditorAction({ type: "set-column-branch", columnId, branchId });
    },
    [dispatchEditorAction],
  );

  const setMajorSkill = useCallback(
    (columnId: BranchColumnId, level: number, skillId: string | null) => {
      dispatchEditorAction({ type: "set-major-skill", columnId, level, skillId });
    },
    [dispatchEditorAction],
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
      dispatchEditorAction({ type: "set-divinity-skill", rowId, slotIndex, skillId });
    },
    [dispatchEditorAction],
  );

  const showAwakenedDivinitySkills = useCallback(() => {
    dispatchEditorAction({ type: "show-awakened-divinity-skills" });
  }, [dispatchEditorAction]);

  const cycleWeaponAwakeningSlot = useCallback(
    (slot: number) => {
      dispatchEditorAction({
        type: "cycle-weapon-awakening",
        slot,
        orderedColorIds: [...weaponAwakeningCatalog.colors]
          .sort((first, second) => first.order - second.order)
          .map((color) => color.id),
      });
    },
    [dispatchEditorAction, weaponAwakeningCatalog.colors],
  );

  const addArtifact = useCallback((id: string) => {
    dispatchEditorAction({ type: "add-artifact", id });
  }, [dispatchEditorAction]);

  const removeArtifact = useCallback((id: string) => {
    dispatchEditorAction({ type: "remove-artifact", id });
  }, [dispatchEditorAction]);

  const addRune = useCallback((id: string) => {
    dispatchEditorAction({ type: "add-rune", id });
  }, [dispatchEditorAction]);

  const removeRune = useCallback((id: string) => {
    dispatchEditorAction({ type: "remove-rune", id });
  }, [dispatchEditorAction]);

  // Установить прогресс столбца точно до уровня (null — снять)
  const setColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number | null) => {
      dispatchEditorAction({ type: "set-column-progress", columnId, level });
    },
    [dispatchEditorAction],
  );

  // Клик по ноде: до неё — активна; повторный клик по верхней — откат на ноду ниже
  const toggleColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number) => {
      dispatchEditorAction({ type: "toggle-column-progress", columnId, level });
    },
    [dispatchEditorAction],
  );

  // Откат прогресса столбца на ноду ниже переданного уровня (при сбросе мажорной ноды)
  const rollbackColumnProgress = useCallback(
    (columnId: BranchColumnId, level: number) => {
      dispatchEditorAction({ type: "rollback-column-progress", columnId, level });
    },
    [dispatchEditorAction],
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
