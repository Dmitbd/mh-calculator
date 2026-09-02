import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  DivinityMajorSkill,
  TreeTemplateMajorSkillNode,
} from "@/features/game-data/divinity/types";
import {
  getBranchTreeTone,
  type BranchTreeTone,
} from "@/shared/ui/BranchTreeGrid";
import { IconPreview } from "@/shared/ui/IconPreview";

type MajorSkillPickerProps = {
  node: TreeTemplateMajorSkillNode;
  skills: readonly DivinityMajorSkill[];
  onSelect: (skillId: string) => void;
  tone: BranchTreeTone;
};

export function MajorSkillPicker({
  node,
  skills,
  onSelect,
  tone: toneName,
}: MajorSkillPickerProps) {
  const tone = getBranchTreeTone(toneName);
  const alignment =
    node.columnId === "left"
      ? "flex-start"
      : node.columnId === "right"
        ? "flex-end"
        : "center";

  return (
    <View
      style={[
        styles.wrapper,
        {
          alignSelf: alignment,
          borderColor: tone.color,
          boxShadow: tone.inactiveLineShadow,
        },
      ]}
      testID={`major-skill-picker-${node.columnId}-${node.level}`}
    >
      {skills.map((skill) => (
        <Pressable
          accessibilityLabel={`Select ${skill.name} for ${node.columnId} level ${node.level}`}
          accessibilityRole="button"
          key={skill.id}
          onPress={() => onSelect(skill.id)}
          style={styles.option}
        >
          <IconPreview label={skill.name} source={skill.icon} size={26} />
          <Text style={styles.optionText}>{skill.name}</Text>
        </Pressable>
      ))}
      {skills.length === 0 ? (
        <Text style={styles.emptyText}>Select branch first</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 140,
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#241610",
  },
  option: {
    minHeight: 38,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    backgroundColor: "#1a100c",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  optionText: {
    color: "#f7dfac",
    fontSize: 12,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  emptyText: {
    color: "#c8aa83",
    fontSize: 12,
    textAlign: "center",
  },
});
