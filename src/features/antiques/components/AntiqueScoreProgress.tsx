import { StyleSheet, Text, View } from "react-native";

type AntiqueScoreProgressProps = {
  totalScore: number;
};

const MAX_SCORE = 12_000;

export function AntiqueScoreProgress({
  totalScore,
}: AntiqueScoreProgressProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Очки соревнования: ${totalScore} из ${MAX_SCORE}`}
      style={styles.container}
    >
      <Text style={styles.label}>Очки соревнования</Text>
      <Text style={styles.value}>
        {totalScore} / {MAX_SCORE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  label: {
    minWidth: 0,
    flexShrink: 1,
    color: "#f4ddb0",
    fontSize: 14,
    fontWeight: "700",
  },
  value: {
    color: "#fff3d1",
    fontSize: 16,
    fontWeight: "800",
  },
});
