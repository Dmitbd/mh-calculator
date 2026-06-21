import { StyleSheet, Text, View } from "react-native";

import { BranchBuilderGrid } from "@/features/builds";
import {
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
  type BranchColumn,
} from "@/features/game-data/divinity";
import type { BranchBuildViewModel } from "../../utils/mapBuildToView";

const columns: BranchColumn[] = [
  { id: "left", label: "левая", isMain: false },
  { id: "center", label: "центр", isMain: true },
  { id: "right", label: "правая", isMain: false },
];

type HeroBuildBranchSectionProps = {
  view: BranchBuildViewModel;
};

export function HeroBuildBranchSection({ view }: HeroBuildBranchSectionProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Ветка</Text>
      <BranchBuilderGrid
        branches={divinityBranches}
        columns={columns}
        progressLevels={view.progressLevels}
        readOnly
        selectedBranches={view.selectedBranches}
        selectedMajorSkills={view.selectedMajorSkills}
        skillCatalog={divinitySkills}
        skills={divinitySkills}
        template={divinityTreeTemplate}
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
