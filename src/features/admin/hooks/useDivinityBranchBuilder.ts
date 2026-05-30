import { useCallback, useMemo, useState } from "react";

import template from "@/features/game-data/divinity/tree-template.json";

import type {
  ActiveBranchNode,
  BranchColumnId,
  BranchProgressLevels,
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

export function useDivinityBranchBuilder() {
  const [heroName, setHeroName] = useState("");
  const [selectedBranches, setSelectedBranches] =
    useState<DraftBranchColumns>(emptySelectedBranches);
  const [selectedMajorSkills, setSelectedMajorSkills] =
    useState<MajorSkillSelections>({});
  const [progressLevels, setProgressLevels] = useState<BranchProgressLevels>({});

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
        progress: progressLevels,
        activeNodes: buildActiveNodes(progressLevels),
        metadata: {
          createdAt,
          source: "manual-branch-builder",
        },
      };
    },
    [heroName, selectedBranches, selectedMajorSkills, progressLevels],
  );

  return useMemo(
    () => ({
      heroName,
      selectedBranches,
      selectedMajorSkills,
      progressLevels,
      setHeroName,
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
      getMajorSkill,
      heroName,
      progressLevels,
      rollbackColumnProgress,
      selectedBranches,
      selectedMajorSkills,
      setColumnBranch,
      setColumnProgress,
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
