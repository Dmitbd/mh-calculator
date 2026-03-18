import { Pressable, StyleSheet, Text, View } from "react-native";

type RangeFieldProps = {
  label: string;
  value: number;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

type DivinityRangeSelectorProps = {
  startLevel: number;
  endLevel: number;
  onDecrementStart: () => void;
  onIncrementStart: () => void;
  onDecrementEnd: () => void;
  onIncrementEnd: () => void;
};

function RangeField({
  label,
  value,
  decrementLabel,
  incrementLabel,
  onDecrement,
  onIncrement,
}: RangeFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={decrementLabel}
          accessibilityRole="button"
          onPress={onDecrement}
          style={styles.button}
        >
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityLabel={incrementLabel}
          accessibilityRole="button"
          onPress={onIncrement}
          style={styles.button}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DivinityRangeSelector({
  startLevel,
  endLevel,
  onDecrementStart,
  onIncrementStart,
  onDecrementEnd,
  onIncrementEnd,
}: DivinityRangeSelectorProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Рассчитать</Text>
      <View style={styles.row}>
        <RangeField
          label="От"
          value={startLevel}
          decrementLabel="Уменьшить начальный уровень"
          incrementLabel="Увеличить начальный уровень"
          onDecrement={onDecrementStart}
          onIncrement={onIncrementStart}
        />
        <RangeField
          label="До"
          value={endLevel}
          decrementLabel="Уменьшить конечный уровень"
          incrementLabel="Увеличить конечный уровень"
          onDecrement={onDecrementEnd}
          onIncrement={onIncrementEnd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#2a160e",
    borderWidth: 1,
    borderColor: "#734227",
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff3d1",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#3b2114",
    padding: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#d7c19a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5a321c",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff3d1",
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff8ef",
  },
});
