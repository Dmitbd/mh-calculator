import { StyleSheet, Text, View } from "react-native";

type WeeklyRivalryScoreProps = {
  totalScore: number;
  maxScore: number;
};

export function WeeklyRivalryScore({
  totalScore,
  maxScore,
}: WeeklyRivalryScoreProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Очки соревнования: ${totalScore} из ${maxScore}`}
      style={styles.container}
    >
      <Text style={styles.label}>Очки соревнования</Text>
      <Text style={styles.value}>
        {totalScore} / {maxScore}
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
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: { color: "#f4ddb0", fontSize: 14, fontWeight: "700" },
  value: { color: "#fff3d1", fontSize: 16, fontWeight: "800" },
});
