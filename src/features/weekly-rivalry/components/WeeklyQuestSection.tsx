import { StyleSheet, Text, View } from "react-native";

import type { QuestSectionProgress } from "../model/types";
import { WeeklyRewardList } from "./WeeklyRewardList";

function formatRewardSummary(
  rewards: QuestSectionProgress["section"]["sectionRewards"],
) {
  return rewards.map((reward) => `${reward.name} ×${reward.amount}`).join(", ");
}

type WeeklyQuestSectionProps = {
  progress: QuestSectionProgress;
  spendResourceGenitivePlural: string;
};

export function WeeklyQuestSection({
  progress,
  spendResourceGenitivePlural,
}: WeeklyQuestSectionProps) {
  const { section } = progress;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Раздел {section.number}</Text>
      <View style={styles.tasks}>
        {progress.tasks.map(({ task, current, isComplete }) => (
          <View
            key={task.id}
            accessible
            accessibilityLabel={`Задание: потратить ${task.requiredSpend} ${spendResourceGenitivePlural}, ${
              isComplete ? "выполнено" : "не выполнено"
            }. Текущий прогресс ${current} из ${task.requiredSpend}. Награды: ${formatRewardSummary(
              task.rewards,
            )}`}
            style={[styles.row, isComplete && styles.completedRow]}
            testID={`weekly-task-${task.id}`}
          >
            <WeeklyRewardList rewards={task.rewards} />
            <View style={styles.progressBlock}>
              {isComplete ? <Text style={styles.check}>✓</Text> : null}
              <Text style={[styles.progress, isComplete && styles.completedText]}>
                {current}/{task.requiredSpend}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View
        accessible
        accessibilityLabel={`Награды раздела ${section.number}: ${
          progress.isComplete ? "получены" : "не получены"
        }. Состав: ${formatRewardSummary(section.sectionRewards)}`}
        style={[styles.footer, progress.isComplete && styles.completedRow]}
        testID={`weekly-section-reward-${section.number}`}
      >
        <View style={styles.footerCopy}>
          <Text style={styles.footerTitle}>
            Награды раздела {section.number}
          </Text>
          <WeeklyRewardList rewards={section.sectionRewards} />
        </View>
        {progress.isComplete ? <Text style={styles.sectionCheck}>✓</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 16,
  },
  title: { color: "#fff3d1", fontSize: 22, fontWeight: "800" },
  tasks: { gap: 8 },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#5a3825",
    backgroundColor: "#3b2114",
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  completedRow: {
    borderColor: "#3d7947",
    backgroundColor: "#24341f",
    opacity: 0.66,
  },
  progressBlock: { alignItems: "flex-end", gap: 2 },
  check: { color: "#64d66f", fontSize: 16, fontWeight: "900" },
  progress: { color: "#f4ddb0", fontSize: 13, fontWeight: "800" },
  completedText: { color: "#82db8b" },
  footer: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#936139",
    backgroundColor: "#442817",
    padding: 12,
  },
  footerCopy: { minWidth: 0, flex: 1, gap: 8 },
  footerTitle: { color: "#f3d38a", fontSize: 14, fontWeight: "800" },
  sectionCheck: { color: "#64d66f", fontSize: 24, fontWeight: "900" },
});
