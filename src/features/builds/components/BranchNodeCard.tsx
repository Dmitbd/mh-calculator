import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  DivinityMajorSkill,
  TreeTemplateMajorSkillNode,
  TreeTemplateMinorStatNode,
} from "@/features/game-data/divinity/types";
import { deriveSkillLevel } from "@/features/game-data/divinity/deriveSkillLevel";
import { IconPreview } from "@/shared/ui/IconPreview";
import { MajorSkillPicker } from "./MajorSkillPicker";

type MinorStatCardProps = {
  /** Нода-стат (только для чтения) */
  node: TreeTemplateMinorStatNode;
  /** Активна ли нода (входит в открытый прогресс столбца) */
  active: boolean;
  /** Клик по ноде — переключить прогресс столбца */
  onPress?: () => void;
  /** Режим только для чтения — без переключения прогресса */
  readOnly?: boolean;
};

/** Карточка минорного стата: клик отмечает прогресс, при active — подсветка */
export function MinorStatCard({
  node,
  active,
  onPress,
  readOnly = false,
}: MinorStatCardProps) {
  const cardStyle = [styles.card, styles.readonlyCard, active && styles.activeCard];
  const displayValue = node.statId.includes("divinity-skill-level")
    ? deriveSkillLevel(node.level)
    : node.value;
  const content = (
    <>
      {node.icon ? (
        <IconPreview label={node.label} source={node.icon} size={24} />
      ) : null}
      <View style={styles.readonlyTextBlock}>
        <Text style={[styles.nodeTitle, styles.readonlyText]}>{node.label}</Text>
        <Text style={[styles.nodeMeta, styles.readonlyText]}>
          +{displayValue}
          {node.unit === "%" ? "%" : ""}
        </Text>
      </View>
    </>
  );

  if (readOnly) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`Toggle progress for ${node.columnId} level ${node.level}`}
      accessibilityRole="button"
      onPress={onPress}
      style={cardStyle}
    >
      {content}
    </Pressable>
  );
}

type MajorNodeCardProps = {
  /** Нода с выбором большого скилла */
  node: TreeTemplateMajorSkillNode;
  /** Активна ли нода (входит в открытый прогресс столбца) */
  active: boolean;
  /** Выбранный скилл или null */
  selectedSkill: DivinityMajorSkill | null;
  /** Доступные для выбора скиллы (по выбранной ветке) */
  availableSkills: readonly DivinityMajorSkill[];
  /** Открыт ли список выбора скилла */
  pickerOpen: boolean;
  /** Открыть список выбора скилла */
  onOpenPicker?: () => void;
  /** Выбрать скилл */
  onSelectSkill?: (skillId: string) => void;
  /** Сбросить выбранный скилл */
  onClearSkill?: () => void;
  /** Режим только для чтения — без пикера и кнопки сброса */
  readOnly?: boolean;
};

/** Карточка мажорной ноды: иконка сверху, имя ниже, выбор скилла и сброс */
export function MajorNodeCard({
  node,
  active,
  selectedSkill,
  availableSkills,
  pickerOpen,
  onOpenPicker,
  onSelectSkill,
  onClearSkill,
  readOnly = false,
}: MajorNodeCardProps) {
  const skillContent = (
    <>
      <IconPreview
        label={selectedSkill?.name ?? "Major skill"}
        source={selectedSkill?.icon ?? null}
        size={30}
      />
      <Text style={[styles.nodeTitle, styles.majorTitle]}>
        {selectedSkill?.name ?? (readOnly ? "—" : "Select skill")}
      </Text>
    </>
  );

  return (
    <View style={[styles.card, active && styles.activeCard]}>
      {readOnly ? (
        <View style={styles.majorButton}>{skillContent}</View>
      ) : (
        <Pressable
          accessibilityLabel={`Choose skill for ${node.columnId} level ${node.level}`}
          accessibilityRole="button"
          onPress={onOpenPicker}
          style={styles.majorButton}
        >
          {skillContent}
        </Pressable>
      )}
      {!readOnly && selectedSkill ? (
        <Pressable
          accessibilityLabel={`Clear skill for ${node.columnId} level ${node.level}`}
          accessibilityRole="button"
          onPress={onClearSkill}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>×</Text>
        </Pressable>
      ) : null}
      {!readOnly && pickerOpen ? (
        <MajorSkillPicker
          node={node}
          onSelect={(skillId) => onSelectSkill?.(skillId)}
          skills={availableSkills}
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
    paddingHorizontal: 4,
    paddingVertical: 8,
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
  // Активная (открытая) нода — золотая рамка и свечение
  activeCard: {
    borderColor: "#f0c36a",
    backgroundColor: "#3a2810",
    boxShadow: "0 0 10px rgba(240, 195, 106, 0.5)",
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
