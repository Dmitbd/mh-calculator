import { Pressable, StyleSheet, Text, View } from "react-native";

type DivinityControlsProps = {
  canIncrement: boolean;
  onIncrement: () => void;
  onReset: () => void;
};

export function DivinityControls({
  canIncrement,
  onIncrement,
  onReset,
}: DivinityControlsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        disabled={!canIncrement}
        onPress={onIncrement}
        style={[styles.primaryButton, !canIncrement && styles.disabledButton]}
      >
        <Text style={styles.primaryText}>Повысить</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onReset} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Сбросить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#9a3412",
    paddingVertical: 16,
  },
  disabledButton: {
    backgroundColor: "#cbd5e1",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    paddingVertical: 16,
  },
  primaryText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#fff7ed",
  },
  secondaryText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#17212b",
  },
});
