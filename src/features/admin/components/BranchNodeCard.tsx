import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  DivinityMajorSkill,
  TreeTemplateMajorSkillNode,
  TreeTemplateMinorStatNode,
} from "../types/admin.types";
import { IconPreview } from "./IconPreview";
import { MajorSkillPicker } from "./MajorSkillPicker";

type BranchNodeCardProps =
  | {
      node: TreeTemplateMinorStatNode;
      selectedSkill: null;
      availableSkills: readonly DivinityMajorSkill[];
      pickerOpen: false;
      onOpenPicker: () => void;
      onSelectSkill: (skillId: string) => void;
    }
  | {
      node: TreeTemplateMajorSkillNode;
      selectedSkill: DivinityMajorSkill | null;
      availableSkills: readonly DivinityMajorSkill[];
      pickerOpen: boolean;
      onOpenPicker: () => void;
      onSelectSkill: (skillId: string) => void;
      onClearSkill: () => void;
    };

export function BranchNodeCard(props: BranchNodeCardProps) {
  const { node } = props;

  if (node.nodeType === "minorStat") {
    return (
      <View style={[styles.card, styles.readonlyCard]}>
        {node.icon ? (
          <IconPreview label={node.label} source={node.icon} size={24} />
        ) : null}
        <View style={styles.readonlyTextBlock}>
          <Text style={[styles.nodeTitle, styles.readonlyText]}>
            {node.label}
          </Text>
          <Text style={[styles.nodeMeta, styles.readonlyText]}>
            +{node.value}
            {node.unit === "%" ? "%" : ""}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={`Choose skill for ${node.columnId} level ${node.level}`}
        accessibilityRole="button"
        onPress={props.onOpenPicker}
        style={styles.majorButton}
      >
        <IconPreview
          label={props.selectedSkill?.name ?? "Major skill"}
          source={props.selectedSkill?.icon ?? null}
          size={30}
        />
        <Text style={[styles.nodeTitle, styles.majorTitle]}>
          {props.selectedSkill?.name ?? "Select skill"}
        </Text>
      </Pressable>
      {props.selectedSkill ? (
        <Pressable
          accessibilityLabel={`Clear skill for ${node.columnId} level ${node.level}`}
          accessibilityRole="button"
          onPress={props.onClearSkill}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>×</Text>
        </Pressable>
      ) : null}
      {props.pickerOpen ? (
        <MajorSkillPicker
          node={node}
          onSelect={props.onSelectSkill}
          skills={props.availableSkills}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#241610",
    padding: 10,
  },
  readonlyCard: {
    alignSelf: "center",
    width: "78%",
    minHeight: 56,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
    backgroundColor: "#1d130f",
  },
  readonlyTextBlock: {
    flexShrink: 1,
    alignItems: "center",
    gap: 2,
  },
  readonlyText: {
    textAlign: "center",
  },
  majorButton: {
    minHeight: 48,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  clearButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#3a241a",
  },
  clearButtonText: {
    color: "#f3d9b3",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 17,
  },
  majorTitle: {
    textAlign: "center",
  },
  nodeTitle: {
    color: "#fff4d7",
    fontSize: 13,
    fontWeight: "800",
  },
  nodeMeta: {
    color: "#bea17b",
    fontSize: 11,
    fontWeight: "700",
  },
});
