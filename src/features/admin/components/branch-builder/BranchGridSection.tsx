import { StyleSheet, Text, View } from "react-native";

import { BranchBuilderGrid } from "@/features/builds";
import type {
  BranchColumn,
  BranchColumnId,
  BranchProgressLevels,
  DivinityBranch,
  DivinityBranchId,
  DivinityMajorSkill,
  DraftBranchColumns,
  TreeTemplateNode,
} from "@/features/game-data/divinity/types";

type ActiveMajorSlot = {
  columnId: BranchColumnId;
  level: number;
} | null;

type BranchGridSectionProps = {
  activeMajorSlot: ActiveMajorSlot;
  branches: readonly DivinityBranch[];
  columns: readonly BranchColumn[];
  onClearMajorSkill: (columnId: BranchColumnId, level: number) => void;
  onOpenMajorSlot: (columnId: BranchColumnId, level: number) => void;
  onSelectBranch: (columnId: BranchColumnId, branchId: DivinityBranchId) => void;
  onSelectMajorSkill: (
    columnId: BranchColumnId,
    level: number,
    skillId: string,
  ) => void;
  onToggleProgress: (columnId: BranchColumnId, level: number) => void;
  progressLevels: BranchProgressLevels;
  selectedBranches: DraftBranchColumns;
  selectedMajorSkills: Partial<Record<string, string>>;
  skills: readonly DivinityMajorSkill[];
  template: readonly TreeTemplateNode[];
};

export function BranchGridSection({
  activeMajorSlot,
  branches,
  columns,
  onClearMajorSkill,
  onOpenMajorSlot,
  onSelectBranch,
  onSelectMajorSkill,
  onToggleProgress,
  progressLevels,
  selectedBranches,
  selectedMajorSkills,
  skills,
  template,
}: BranchGridSectionProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Ветка</Text>
      <BranchBuilderGrid
        activeMajorSlot={activeMajorSlot}
        branches={branches}
        columns={columns}
        onClearMajorSkill={onClearMajorSkill}
        onOpenMajorSlot={onOpenMajorSlot}
        onSelectBranch={onSelectBranch}
        onSelectMajorSkill={onSelectMajorSkill}
        onToggleProgress={onToggleProgress}
        progressLevels={progressLevels}
        selectedBranches={selectedBranches}
        selectedMajorSkills={selectedMajorSkills}
        skillCatalog={skills}
        skills={skills}
        template={template}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
