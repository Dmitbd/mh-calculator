import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  DivinityMajorSkill,
  TreeTemplateMajorSkillNode,
} from "../types/admin.types";
import { IconPreview } from "./IconPreview";

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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    backgroundColor: "#1a100c",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  optionText: {
    flex: 1,
    color: "#f7dfac",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#c8aa83",
    fontSize: 12,
    textAlign: "center",
  },
});
