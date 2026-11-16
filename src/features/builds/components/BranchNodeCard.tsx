import { StyleSheet, View } from "react-native";

import type {
  DivinityMajorSkill,
  TreeTemplateMajorSkillNode,
  TreeTemplateMinorStatNode,
} from "@/features/game-data/divinity/types";
import { BranchNodeVisual } from "@/shared/ui/BranchNodeVisual";
import type { BranchTreeTone } from "@/shared/ui/BranchTreeGrid";

type MinorStatCardProps = {
  readonly node: TreeTemplateMinorStatNode;
  readonly active: boolean;
  readonly onPress: () => void;
  readonly readOnly?: boolean;
  readonly tone: BranchTreeTone;
};

export function MinorStatCard({
  node,
  active,
  onPress,
  readOnly = false,
  tone,
}: MinorStatCardProps) {
  return (
    <BranchNodeVisual
      active={active}
      accessibilityLabel={
        readOnly
          ? `${node.label}, уровень ${node.level}, +${node.value}${node.unit === "%" ? "%" : ""}`
          : `Toggle progress for ${node.columnId} level ${node.level}`
      }
      icon={node.icon}
      size={node.unit === "level" ? "large" : "small"}
      onPress={readOnly ? undefined : onPress}
      testID={`branch-node-${node.columnId}-${node.level}`}
      tone={tone}
    />
  );
}

type MajorNodeCardProps = {
  readonly node: TreeTemplateMajorSkillNode;
  readonly active: boolean;
  readonly selectedSkill: DivinityMajorSkill | null;
  readonly onPress: () => void;
  readonly readOnly?: boolean;
  readonly tone: BranchTreeTone;
};

export function MajorNodeCard({
  node,
  active,
  selectedSkill,
  onPress,
  readOnly = false,
  tone,
}: MajorNodeCardProps) {
  return (
    <View style={styles.majorContainer}>
      <BranchNodeVisual
        active={active}
        accessibilityLabel={
          readOnly
            ? `${selectedSkill?.name ?? "Большой талант не выбран"}, уровень ${node.level}`
            : `Choose skill for ${node.columnId} level ${node.level}`
        }
        icon={selectedSkill?.icon ?? null}
        size="large"
        onPress={readOnly ? undefined : onPress}
        showPlus={!readOnly && !selectedSkill}
        testID={`branch-node-${node.columnId}-${node.level}`}
        tone={tone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  majorContainer: {
    position: "relative",
    alignItems: "center",
  },
});
