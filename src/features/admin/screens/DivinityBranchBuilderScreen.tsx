import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import branchesData from "@/features/game-data/divinity/divinity-branches.json";
import skillsData from "@/features/game-data/divinity/divinity-skills.json";
import templateData from "@/features/game-data/divinity/tree-template.json";

import { BranchBuilderGrid } from "../components/BranchBuilderGrid";
import { DownloadJsonButton } from "../components/DownloadJsonButton";
import { HeroNameInput } from "../components/HeroNameInput";
import { useDivinityBranchBuilder } from "../hooks/useDivinityBranchBuilder";
import type {
  BranchBuildValidationError,
  BranchColumn,
  BranchColumnId,
  DivinityBranch,
  DivinityMajorSkill,
  TreeTemplateNode,
} from "../types/admin.types";
import { validateBranchBuild } from "../utils/validateBranchBuild";

const columns: BranchColumn[] = [
  { id: "left", label: "Left branch", isMain: false },
  { id: "center", label: "Center main branch", isMain: true },
  { id: "right", label: "Right branch", isMain: false },
];

const branches = [...(branchesData as DivinityBranch[])].sort(
  (first, second) => first.order - second.order,
);
const skills = skillsData as DivinityMajorSkill[];
const template = templateData as TreeTemplateNode[];

export function DivinityBranchBuilderScreen() {
  const builder = useDivinityBranchBuilder();
  const [activeMajorSlot, setActiveMajorSlot] = useState<{
    columnId: BranchColumnId;
    level: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    BranchBuildValidationError[]
  >([]);

  const selectedMajorSkills = useMemo(
    () => builder.selectedMajorSkills,
    [builder.selectedMajorSkills],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Divinity Branch Builder</Text>
      </View>

      <View style={styles.section}>
        <HeroNameInput value={builder.heroName} onChange={builder.setHeroName} />
      </View>

      <View style={styles.section}>
        <BranchBuilderGrid
          activeMajorSlot={activeMajorSlot}
          branches={branches}
          columns={columns}
          onOpenMajorSlot={(columnId, level) =>
            setActiveMajorSlot({ columnId, level })
          }
          onSelectBranch={builder.setColumnBranch}
          onSelectMajorSkill={(columnId, level, skillId) => {
            builder.setMajorSkill(columnId, level, skillId);
            setActiveMajorSlot(null);
          }}
          selectedBranches={builder.selectedBranches}
          selectedMajorSkills={selectedMajorSkills}
          skills={skills}
          template={template}
        />
      </View>

      <View style={styles.section}>
        <DownloadJsonButton
          errors={validationErrors}
          onPress={() => {
            const result = validateBranchBuild(builder.buildValidationDraft(), {
              branches,
              skills,
              template,
            });

            setValidationErrors(result.errors);
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 18,
    backgroundColor: "#140d0b",
    padding: 20,
  },
  header: {
    paddingTop: 10,
  },
  title: {
    color: "#f3d38a",
    fontSize: 28,
    fontWeight: "900",
  },
  section: {
    width: "100%",
  },
});
