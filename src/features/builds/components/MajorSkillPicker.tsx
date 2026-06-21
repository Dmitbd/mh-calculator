import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  DivinityMajorSkill,
  TreeTemplateMajorSkillNode,
} from "@/features/game-data/divinity/types";
import { IconPreview } from "@/shared/ui/IconPreview";

type MajorSkillPickerProps = {
  node: TreeTemplateMajorSkillNode;
  skills: readonly DivinityMajorSkill[];
  onSelect: (skillId: string) => void;
};

export function MajorSkillPicker({
  node,
  skills,
  onSelect,
}: MajorSkillPickerProps) {
  return (
    <View style={styles.wrapper}>
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
    gap: 6,
    paddingTop: 8,
  },
  option: {
    minHeight: 34,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 6,
    backgroundColor: "#1a100c",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  optionText: {
    color: "#f7dfac",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  emptyText: {
    color: "#c8aa83",
    fontSize: 12,
    textAlign: "center",
  },
});
