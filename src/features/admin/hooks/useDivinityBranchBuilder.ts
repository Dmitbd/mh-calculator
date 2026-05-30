import { useCallback, useMemo, useState } from "react";

import template from "@/features/game-data/divinity/tree-template.json";

import type {
  BranchColumnId,
  DivinityBranchBuildExport,
  DivinityBranchBuildMajorNode,
  DivinityBranchBuildValidationDraft,
  DivinityBranchId,
  DraftBranchColumns,
} from "../types/admin.types";

type MajorSkillSelections = Partial<Record<string, string>>;

const emptySelectedBranches: DraftBranchColumns = {
  left: null,
  center: null,
  right: null,
};

const columnIds: BranchColumnId[] = ["left", "center", "right"];

export function useDivinityBranchBuilder() {
  const [heroName, setHeroName] = useState("");
  const [selectedBranches, setSelectedBranches] =
    useState<DraftBranchColumns>(emptySelectedBranches);
  const [selectedMajorSkills, setSelectedMajorSkills] =
    useState<MajorSkillSelections>({});

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

  const buildValidationDraft =
    useCallback((): DivinityBranchBuildValidationDraft => {
      return {
        heroName,
        columns: selectedBranches,
        majorNodes: buildMajorNodes(selectedBranches, selectedMajorSkills),
      };
    }, [heroName, selectedBranches, selectedMajorSkills]);

  const buildExport = useCallback(
    (createdAt = new Date().toISOString()): DivinityBranchBuildExport | null => {
      if (!hasSelectedAllBranches(selectedBranches)) {
        return null;
      }

      const majorNodes = buildMajorNodes(selectedBranches, selectedMajorSkills);

      if (majorNodes.length !== getMajorSlotCount()) {
        return null;
      }

      return {
        schemaVersion: 1,
        heroName,
        columns: selectedBranches,
        majorNodes,
        metadata: {
          createdAt,
          source: "manual-branch-builder",
        },
      };
    },
    [heroName, selectedBranches, selectedMajorSkills],
  );

  return useMemo(
    () => ({
      heroName,
      selectedBranches,
      selectedMajorSkills,
      setHeroName,
      setColumnBranch,
      setMajorSkill,
      getMajorSkill,
      buildValidationDraft,
      buildExport,
    }),
    [
      buildValidationDraft,
      buildExport,
      getMajorSkill,
      heroName,
      selectedBranches,
      selectedMajorSkills,
      setColumnBranch,
      setMajorSkill,
    ],
  );
}

function getMajorSkillKey(columnId: BranchColumnId, level: number): string {
  return `${columnId}:${level}`;
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
