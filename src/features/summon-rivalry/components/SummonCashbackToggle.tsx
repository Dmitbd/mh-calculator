import { Pressable, StyleSheet, Text, View } from "react-native";

type SummonCashbackToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SummonCashbackToggle({
  checked,
  onChange,
}: SummonCashbackToggleProps) {
  return (
    <Pressable
      accessibilityLabel="Учитывать кешбэк"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.label}>Учитывать кешбэк</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  pressed: { opacity: 0.8 },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#a87943",
    backgroundColor: "#1d110d",
  },
  checkboxChecked: {
    borderColor: "#64d66f",
    backgroundColor: "#2d873c",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  label: {
    flexShrink: 1,
    color: "#f4ddb0",
    fontSize: 15,
    fontWeight: "700",
  },
});
