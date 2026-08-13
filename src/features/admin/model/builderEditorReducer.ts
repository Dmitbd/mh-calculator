import { branchBuilderTemplate } from "../data/branchBuilderCatalogs";
import type {
  BranchColumnId,
  DivinityBranchId,
  DivinitySkillLoadoutRowId,
  WeaponAwakeningColorId,
} from "../types/admin.types";
import type { EditableBuildDraft } from "./publishedBuilderEditModel";

export type BuilderEditorAction =
  | { type: "set-column-branch"; columnId: BranchColumnId; branchId: DivinityBranchId | null }
  | { type: "set-major-skill"; columnId: BranchColumnId; level: number; skillId: string | null }
  | { type: "set-divinity-skill"; rowId: DivinitySkillLoadoutRowId; slotIndex: number; skillId: string | null }
  | { type: "show-awakened-divinity-skills" }
  | { type: "set-weapon-awakening"; slot: number; colorId: WeaponAwakeningColorId | null }
  | { type: "cycle-weapon-awakening"; slot: number; orderedColorIds: readonly WeaponAwakeningColorId[] }
  | { type: "add-artifact"; id: string }
  | { type: "remove-artifact"; id: string }
  | { type: "add-rune"; id: string }
  | { type: "remove-rune"; id: string }
  | { type: "set-column-progress"; columnId: BranchColumnId; level: number | null }
  | { type: "toggle-column-progress"; columnId: BranchColumnId; level: number }
  | { type: "rollback-column-progress"; columnId: BranchColumnId; level: number };

const columnIds: BranchColumnId[] = ["left", "center", "right"];
const columnNodeLevels = columnIds.reduce<Record<BranchColumnId, number[]>>(
  (levels, columnId) => ({
    ...levels,
    [columnId]: branchBuilderTemplate
      .filter((node) => node.columnId === columnId)
      .map((node) => node.level)
      .sort((first, second) => first - second),
  }),
  { left: [], center: [], right: [] },
);

export function createEmptyEditableBuildDraft(): EditableBuildDraft {
  return {
    selectedBranches: { left: null, center: null, right: null },
    selectedMajorSkills: {},
    selectedDivinitySkills: { base: [], awakened: [], awakenedEnabled: false },
    weaponAwakeningSelections: {},
    selectedArtifactIds: [],
    selectedRuneIds: [],
    progressLevels: {},
  };
}

export function reduceEditableBuildDraft(
  draft: EditableBuildDraft,
  action: BuilderEditorAction,
): EditableBuildDraft {
  switch (action.type) {
    case "set-column-branch": {
      if (action.branchId && columnIds.some((columnId) =>
        columnId !== action.columnId && draft.selectedBranches[columnId] === action.branchId,
      )) return draft;
      const changed = draft.selectedBranches[action.columnId] !== action.branchId;
      if (!changed) return draft;
      const majorPrefix = `${action.columnId}:`;
      const { [action.columnId]: _removed, ...remainingProgress } = draft.progressLevels;
      return {
        ...draft,
        selectedBranches: { ...draft.selectedBranches, [action.columnId]: action.branchId },
        selectedMajorSkills: Object.fromEntries(
          Object.entries(draft.selectedMajorSkills).filter(([key]) => !key.startsWith(majorPrefix)),
        ),
        selectedDivinitySkills: { base: [], awakened: [], awakenedEnabled: false },
        progressLevels: remainingProgress,
      };
    }
    case "set-major-skill": {
      const key = `${action.columnId}:${action.level}`;
      if (!action.skillId) {
        const { [key]: _removed, ...remaining } = draft.selectedMajorSkills;
        return { ...draft, selectedMajorSkills: remaining };
      }
      return { ...draft, selectedMajorSkills: { ...draft.selectedMajorSkills, [key]: action.skillId } };
    }
    case "set-divinity-skill": {
      const values = [...draft.selectedDivinitySkills[action.rowId]];
      values[action.slotIndex] = action.skillId;
      return { ...draft, selectedDivinitySkills: { ...draft.selectedDivinitySkills, [action.rowId]: values } };
    }
    case "show-awakened-divinity-skills":
      return { ...draft, selectedDivinitySkills: { ...draft.selectedDivinitySkills, awakenedEnabled: true } };
    case "set-weapon-awakening": {
      const next = { ...draft.weaponAwakeningSelections };
      if (action.colorId) next[action.slot] = action.colorId;
      else delete next[action.slot];
      return { ...draft, weaponAwakeningSelections: next };
    }
    case "cycle-weapon-awakening": {
      if (action.orderedColorIds.length === 0) {
        throw new Error("Weapon awakening colors catalog is empty.");
      }
      const current = draft.weaponAwakeningSelections[action.slot] ?? null;
      const currentIndex = current
        ? action.orderedColorIds.indexOf(current)
        : -1;
      const nextColorId = action.orderedColorIds[
        (currentIndex + 1) % action.orderedColorIds.length
      ];
      return {
        ...draft,
        weaponAwakeningSelections: {
          ...draft.weaponAwakeningSelections,
          [action.slot]: nextColorId,
        },
      };
    }
    case "add-artifact":
      return draft.selectedArtifactIds.includes(action.id) ? draft : { ...draft, selectedArtifactIds: [...draft.selectedArtifactIds, action.id] };
    case "remove-artifact":
      return { ...draft, selectedArtifactIds: draft.selectedArtifactIds.filter((id) => id !== action.id) };
    case "add-rune":
      return draft.selectedRuneIds.includes(action.id) ? draft : { ...draft, selectedRuneIds: [...draft.selectedRuneIds, action.id] };
    case "remove-rune":
      return { ...draft, selectedRuneIds: draft.selectedRuneIds.filter((id) => id !== action.id) };
    case "set-column-progress":
      return setProgress(draft, action.columnId, action.level);
    case "toggle-column-progress":
      return setProgress(
        draft,
        action.columnId,
        draft.progressLevels[action.columnId] === action.level
          ? getPreviousNodeLevel(action.columnId, action.level)
          : action.level,
      );
    case "rollback-column-progress":
      return setProgress(draft, action.columnId, getPreviousNodeLevel(action.columnId, action.level));
  }
}

function setProgress(draft: EditableBuildDraft, columnId: BranchColumnId, level: number | null): EditableBuildDraft {
  const progressLevels = { ...draft.progressLevels };
  if (level === null) delete progressLevels[columnId];
  else progressLevels[columnId] = level;
  return { ...draft, progressLevels };
}

function getPreviousNodeLevel(columnId: BranchColumnId, level: number): number | null {
  const previous = columnNodeLevels[columnId].filter((nodeLevel) => nodeLevel < level);
  return previous[previous.length - 1] ?? null;
}
