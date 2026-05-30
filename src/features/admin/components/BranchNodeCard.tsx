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
    };

export function BranchNodeCard(props: BranchNodeCardProps) {
  const { node } = props;

  if (node.nodeType === "minorStat") {
    return (
      <View style={[styles.card, styles.readonlyCard]}>
        <IconPreview label={node.label} source={node.icon} size={28} />
        <View style={styles.textBlock}>
          <Text style={styles.nodeTitle}>{node.label}</Text>
          <Text style={styles.nodeMeta}>
            {node.value}
            {node.unit === "%" ? "%" : ` ${node.unit}`}
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
          label={props.selectedSkill?.name ?? `Tier ${node.tier}`}
          source={props.selectedSkill?.icon ?? null}
          size={30}
        />
        <View style={styles.textBlock}>
          <Text style={styles.nodeTitle}>
            {props.selectedSkill?.name ?? "Select skill"}
          </Text>
          <Text style={styles.nodeMeta}>Tier {node.tier}</Text>
        </View>
      </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1d130f",
  },
  majorButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textBlock: {
    flex: 1,
    gap: 3,
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
