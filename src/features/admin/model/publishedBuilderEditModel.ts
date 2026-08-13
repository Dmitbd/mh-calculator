import type {
  DivinityBranchBuilderExport,
  DivinityBranchBuildExport,
  DivinityBranchBuildValidationDraft,
  DivinityGameMode,
  DivinitySkillLoadout,
} from "@/features/game-data/builds/types";
import { compactDivinitySkillIds } from "@/features/game-data/divinity";
import type {
  HeroBuildSet,
  HeroBuildTab,
  HeroBuildTabPath,
} from "@/features/game-data/heroes";
import { getHeroById, getGameModeForPath } from "@/features/game-data/heroes";

import { branchBuilderTemplate } from "../data/branchBuilderCatalogs";
import type {
  ActiveBranchNode,
  BranchColumnId,
  BranchBuildValidationError,
  BranchBuildValidationResult,
  BranchProgressLevels,
  DivinityBranchBuildMajorNode,
  DivinityBranchId,
  DivinitySkillLoadoutDraft,
  DraftBranchColumns,
  EquipmentVariantSelection,
  HeroBuildTargetTabPath,
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
} from "../types/admin.types";
import { buildWeaponAwakeningSlots } from "../utils/weaponAwakening";
import {
  buildHeroBuildSetFromSavedBuilds,
  getBuildTargetLeafTabs,
  getBuildTargetPathKey,
  type BuildTargetLeafTab,
  type SavedBuildsByPath,
} from "./multiBuildExport";

export type MajorSkillSelections = Partial<Record<string, string>>;
export type WeaponAwakeningSelections = Partial<
  Record<number, WeaponAwakeningColorId>
>;

export type EditableBuildDraft = {
  selectedBranches: DraftBranchColumns;
  selectedMajorSkills: MajorSkillSelections;
  selectedDivinitySkills: DivinitySkillLoadoutDraft;
  weaponAwakeningSelections: WeaponAwakeningSelections;
  selectedArtifactIds: string[];
  selectedRuneIds: string[];
  progressLevels: BranchProgressLevels;
};

export type DraftsByPath = Record<string, EditableBuildDraft>;

export type PublishedBuilderEditState = {
  baselineBuildsByPath: SavedBuildsByPath;
  draftsByPath: DraftsByPath;
  firstTabPath: HeroBuildTabPath;
  targetTabs: HeroBuildTab[];
};

export type PublishedBuilderValidationSection =
  | "targetTabs"
  | "hero"
  | "equipment"
  | "weaponAwakening"
  | "divinitySkills"
  | "branchGrid";

export type FirstInvalidPublishedBuild = {
  tabPath: HeroBuildTabPath;
  path: string;
  section: PublishedBuilderValidationSection;
};

const columnIds: BranchColumnId[] = ["left", "center", "right"];

export function buildValidationDraftFromEditable(params: {
  draft: EditableBuildDraft;
  gameMode: DivinityGameMode;
  heroId: string | null;
  heroName: string;
  weaponAwakeningCatalog: {
    colors: readonly WeaponAwakeningColor[];
    slots: readonly WeaponAwakeningSlot[];
  };
}): DivinityBranchBuildValidationDraft {
  return {
    gameMode: params.gameMode,
    heroId: params.heroId,
    heroName: params.heroName,
    columns: params.draft.selectedBranches,
    majorNodes: buildMajorNodes(
      params.draft.selectedBranches,
      params.draft.selectedMajorSkills,
    ),
    divinitySkills: buildDivinitySkillsFromDraft(params.draft),
    weaponAwakening: buildWeaponAwakeningSlots(
      params.weaponAwakeningCatalog.slots,
      params.draft.weaponAwakeningSelections,
    ),
    equipment: {
      artifactIds: params.draft.selectedArtifactIds,
      runeIds: params.draft.selectedRuneIds,
    },
    progress: params.draft.progressLevels,
  };
}

export function buildExportFromEditable(params: {
  createdAt: string;
  draft: EditableBuildDraft;
  heroId: string | null;
  targetTabPath: HeroBuildTargetTabPath;
  targetTabs: readonly HeroBuildTab[];
  weaponAwakeningCatalog: {
    colors: readonly WeaponAwakeningColor[];
    slots: readonly WeaponAwakeningSlot[];
  };
}): DivinityBranchBuilderExport | null {
  const gameMode = getGameModeForPath(
    [...params.targetTabs],
    params.targetTabPath,
  );
  const hero = params.heroId ? getHeroById(params.heroId) : null;
  const equipment: EquipmentVariantSelection = {
    artifactIds: params.draft.selectedArtifactIds,
    runeIds: params.draft.selectedRuneIds,
  };

  if (
    !gameMode ||
    !hero ||
    equipment.artifactIds.length === 0 ||
    equipment.runeIds.length === 0 ||
    !hasSelectedAllBranches(params.draft.selectedBranches)
  ) {
    return null;
  }

  const majorNodes = buildMajorNodes(
    params.draft.selectedBranches,
    params.draft.selectedMajorSkills,
  );
  const weaponAwakening = buildWeaponAwakeningSlots(
    params.weaponAwakeningCatalog.slots,
    params.draft.weaponAwakeningSelections,
  );

  if (
    majorNodes.length !== getMajorSlotCount() ||
    weaponAwakening.length !== params.weaponAwakeningCatalog.slots.length
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    gameMode,
    heroId: hero.id,
    heroName: hero.name.ru,
    targetTabPath: [...params.targetTabPath],
    columns: params.draft.selectedBranches,
    majorNodes,
    divinitySkills: buildDivinitySkillsFromDraft(params.draft),
    weaponAwakening,
    equipment,
    progress: params.draft.progressLevels,
    activeNodes: buildActiveNodes(params.draft.progressLevels),
    metadata: {
      createdAt: params.createdAt,
      source: "manual-branch-builder",
    },
  };
}

export function createPublishedBuilderEditState(
  buildSet: HeroBuildSet,
  targetTabs: readonly HeroBuildTab[],
): PublishedBuilderEditState | null {
  const loadedBuilds = extractBuildsFromTabs(buildSet.tabs);
  const targetLeaves = getBuildTargetLeafTabs(targetTabs);
  const editTabs = cloneTabs(buildSet.tabs);
  const leaves = getBuildTargetLeafTabs(editTabs);

  if (
    leaves.length === 0 ||
    targetLeaves.some(
      (leaf) => !loadedBuilds[getBuildTargetPathKey(leaf.path)],
    ) ||
    leaves.some((leaf) => !loadedBuilds[getBuildTargetPathKey(leaf.path)])
  ) {
    return null;
  }

  const baselineBuildsByPath = cloneBuildsByPath(loadedBuilds);
  const draftsByPath = leaves.reduce<DraftsByPath>((drafts, leaf) => {
    const key = getBuildTargetPathKey(leaf.path);

    return {
      ...drafts,
      [key]: exportToEditableDraft(baselineBuildsByPath[key]),
    };
  }, {});

  return {
    baselineBuildsByPath,
    draftsByPath,
    firstTabPath: [...leaves[0].path],
    targetTabs: editTabs,
  };
}

export function resetPublishedBuilderBaseline(
  nextBaselineBuilds: SavedBuildsByPath,
): SavedBuildsByPath {
  return cloneBuildsByPath(nextBaselineBuilds);
}

export function isPublishedBuilderDirty(
  baselineBuildsByPath: SavedBuildsByPath,
  draftsByPath: DraftsByPath,
): boolean {
  const baselineKeys = Object.keys(baselineBuildsByPath).sort();
  const draftKeys = Object.keys(draftsByPath).sort();

  if (
    baselineKeys.length !== draftKeys.length ||
    baselineKeys.some((key, index) => key !== draftKeys[index])
  ) {
    return true;
  }

  return baselineKeys.some((key) => {
    const baseline = baselineBuildsByPath[key];
    const draft = draftsByPath[key];

    return (
      !baseline ||
      !draft ||
      JSON.stringify(toComparableDraft(exportToEditableDraft(baseline))) !==
        JSON.stringify(toComparableDraft(draft))
    );
  });
}

export function buildPublishedBuilderBuildSet(params: {
  targetTabs: readonly HeroBuildTab[];
  draftsByPath: DraftsByPath;
  buildLeaf: (
    leaf: BuildTargetLeafTab,
    draft: EditableBuildDraft,
  ) => DivinityBranchBuildExport | null;
}): HeroBuildSet | null {
  const buildsByPath: SavedBuildsByPath = {};

  for (const leaf of getBuildTargetLeafTabs(params.targetTabs)) {
    const key = getBuildTargetPathKey(leaf.path);
    const draft = params.draftsByPath[key];

    if (!draft) {
      return null;
    }

    const build = params.buildLeaf(leaf, draft);

    if (!build) {
      return null;
    }

    buildsByPath[key] = build;
  }

  return buildHeroBuildSetFromSavedBuilds(params.targetTabs, buildsByPath);
}

export function validatePublishedBuilderDrafts(params: {
  targetTabs: readonly HeroBuildTab[];
  draftsByPath: DraftsByPath;
  validateLeaf: (
    leaf: BuildTargetLeafTab,
    draft: EditableBuildDraft,
  ) => BranchBuildValidationResult;
}): BranchBuildValidationResult {
  const errors: BranchBuildValidationError[] = [];

  for (const leaf of getBuildTargetLeafTabs(params.targetTabs)) {
    const key = getBuildTargetPathKey(leaf.path);
    const draft = params.draftsByPath[key];

    if (!draft) {
      errors.push({
        code: "multiBuild.missingTab",
        message: `${leaf.label}: Сохраните билд для этой вкладки.`,
        path: key,
      });
      continue;
    }

    params.validateLeaf(leaf, draft).errors.forEach((error) => {
      errors.push({
        ...error,
        message: `${leaf.label}: ${error.message}`,
        path: error.path ? `${key}.${error.path}` : key,
      });
    });
  }

  return { isValid: errors.length === 0, errors };
}

export function getFirstInvalidPublishedBuild(
  errors: readonly BranchBuildValidationError[],
  targetTabs: readonly HeroBuildTab[],
): FirstInvalidPublishedBuild | null {
  const firstError = errors[0];

  if (!firstError?.path) {
    return null;
  }

  const errorPath = firstError.path;

  const matchingLeaf = getBuildTargetLeafTabs(targetTabs).find((leaf) => {
    const key = getBuildTargetPathKey(leaf.path);
    return errorPath === key || errorPath.startsWith(`${key}.`);
  });

  if (!matchingLeaf) {
    return null;
  }

  const key = getBuildTargetPathKey(matchingLeaf.path);
  const path = errorPath === key ? "" : errorPath.slice(key.length + 1);

  return {
    tabPath: [...matchingLeaf.path],
    path,
    section: getValidationSection(path),
  };
}

export function cloneEditableBuildDraft(
  draft: EditableBuildDraft,
): EditableBuildDraft {
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

export function exportToEditableDraft(
  exported: DivinityBranchBuildExport,
): EditableBuildDraft {
  return {
    selectedBranches: { ...exported.columns },
    selectedMajorSkills: Object.fromEntries(
      exported.majorNodes.map((node) => [
        `${node.columnId}:${node.level}`,
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

export function extractBuildsFromTabs(
  tabs: readonly HeroBuildTab[],
  parentPath: HeroBuildTabPath = [],
): SavedBuildsByPath {
  return tabs.reduce<SavedBuildsByPath>((savedBuilds, tab) => {
    const path = [...parentPath, tab.id];

    if (tab.kind === "group" && tab.children) {
      return {
        ...savedBuilds,
        ...extractBuildsFromTabs(tab.children, path),
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

function cloneBuildsByPath(buildsByPath: SavedBuildsByPath): SavedBuildsByPath {
  return Object.fromEntries(
    Object.entries(buildsByPath).map(([key, build]) => [key, cloneBuild(build)]),
  );
}

function cloneTabs(tabs: readonly HeroBuildTab[]): HeroBuildTab[] {
  return tabs.map((tab) => ({
    ...tab,
    build: tab.build ? cloneBuild(tab.build) : null,
    children: tab.children ? cloneTabs(tab.children) : undefined,
  }));
}

function cloneBuild(build: DivinityBranchBuildExport): DivinityBranchBuildExport {
  return {
    ...build,
    columns: { ...build.columns },
    majorNodes: build.majorNodes.map((node) => ({ ...node })),
    divinitySkills: build.divinitySkills
      ? {
          base: [...build.divinitySkills.base],
          ...(build.divinitySkills.awakened
            ? { awakened: [...build.divinitySkills.awakened] }
            : {}),
        }
      : undefined,
    weaponAwakening: build.weaponAwakening.map((entry) => ({ ...entry })),
    equipment: {
      artifactIds: [...build.equipment.artifactIds],
      runeIds: [...build.equipment.runeIds],
    },
    progress: { ...build.progress },
    activeNodes: build.activeNodes.map((node) => ({ ...node })),
    metadata: { ...build.metadata },
  };
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

function toComparableDraft(draft: EditableBuildDraft) {
  return {
    selectedBranches: draft.selectedBranches,
    selectedMajorSkills: sortRecord(draft.selectedMajorSkills),
    selectedDivinitySkills: draft.selectedDivinitySkills,
    weaponAwakeningSelections: sortRecord(draft.weaponAwakeningSelections),
    selectedArtifactIds: draft.selectedArtifactIds,
    selectedRuneIds: draft.selectedRuneIds,
    progressLevels: sortRecord(draft.progressLevels),
  };
}

function sortRecord<T>(record: Partial<Record<string | number, T>>) {
  return Object.fromEntries(
    Object.entries(record).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function getValidationSection(path: string): PublishedBuilderValidationSection {
  if (!path) {
    return "targetTabs";
  }

  if (path === "heroId" || path === "heroName") {
    return "hero";
  }

  if (path.startsWith("equipment.")) {
    return "equipment";
  }

  if (path.startsWith("weaponAwakening.")) {
    return "weaponAwakening";
  }

  if (path.startsWith("divinitySkills.")) {
    return "divinitySkills";
  }

  return "branchGrid";
}

function buildDivinitySkillsFromDraft(
  draft: EditableBuildDraft,
): DivinitySkillLoadout {
  const base = compactDivinitySkillIds(draft.selectedDivinitySkills.base);
  const awakened = draft.selectedDivinitySkills.awakenedEnabled
    ? compactDivinitySkillIds(draft.selectedDivinitySkills.awakened)
    : [];

  return awakened.length > 0 ? { base, awakened } : { base };
}

function buildActiveNodes(
  progressLevels: BranchProgressLevels,
): ActiveBranchNode[] {
  const activeNodes: ActiveBranchNode[] = [];

  columnIds.forEach((columnId) => {
    const progress = progressLevels[columnId];

    if (progress === undefined) {
      return;
    }

    branchBuilderTemplate
      .filter((node) => node.columnId === columnId && node.level <= progress)
      .sort((first, second) => first.level - second.level)
      .forEach((node) => activeNodes.push({ columnId, level: node.level }));
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
  return branchBuilderTemplate
    .filter((node) => node.nodeType === "majorSkill")
    .map((node) => {
      const columnId = node.columnId as BranchColumnId;
      const branchId = selectedBranches[columnId];
      const skillId = selectedMajorSkills[`${columnId}:${node.level}`];

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
  return branchBuilderTemplate.filter((node) => node.nodeType === "majorSkill")
    .length;
}
