import { Pressable, StyleSheet, Text, View } from "react-native";

export type InstructionButtonProps = {
  accessibilityLabel: string;
  onPress: () => void;
  title?: string;
};

export function InstructionButton({
  accessibilityLabel,
  onPress,
  title = "Инструкция",
}: InstructionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>?</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#734227",
    borderRadius: 18,
    backgroundColor: "#2a160e",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#5a321c",
  },
  iconText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff3d1",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffd8b0",
  },
});
