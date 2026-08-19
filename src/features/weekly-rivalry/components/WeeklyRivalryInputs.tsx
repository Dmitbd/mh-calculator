import { StyleSheet, Text, TextInput, View } from "react-native";

import type { WeeklyRivalryReward } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryResourceIcon } from "./WeeklyRivalryResourceIcon";

type WeeklyRivalryInputsProps = {
  spendResource: WeeklyRivalryReward;
  spendResourceGenitivePlural: string;
  chestResource: WeeklyRivalryReward;
  spendResourceCount: number;
  weeklyEventChests: number;
  onChangeSpendResource: (value: string) => void;
  onChangeWeeklyEventChests: (value: string) => void;
};

type ResourceFieldProps = {
  accessibilityLabel: string;
  resource: WeeklyRivalryReward;
  value: number;
  onChangeText: (value: string) => void;
};

function ResourceField({
  accessibilityLabel,
  resource,
  value,
  onChangeText,
}: ResourceFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <WeeklyRivalryResourceIcon resource={resource} size={44} />
        <Text style={styles.fieldLabel}>{resource.name}</Text>
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        keyboardType="number-pad"
        onChangeText={onChangeText}
        selectTextOnFocus
        style={styles.input}
        value={String(value)}
      />
    </View>
  );
}

export function WeeklyRivalryInputs({
  spendResource,
  spendResourceGenitivePlural,
  chestResource,
  spendResourceCount,
  weeklyEventChests,
  onChangeSpendResource,
  onChangeWeeklyEventChests,
}: WeeklyRivalryInputsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Мои ресурсы</Text>
      <Text style={styles.description}>
        {spendResource.name} и сундуки используются в соперничестве и заданиях
      </Text>
      <View style={styles.fields}>
        <ResourceField
          accessibilityLabel={`Количество ${spendResourceGenitivePlural}`}
          onChangeText={onChangeSpendResource}
          resource={spendResource}
          value={spendResourceCount}
        />
        <ResourceField
          accessibilityLabel="Количество персональных сундуков еженедельного события"
          onChangeText={onChangeWeeklyEventChests}
          resource={chestResource}
          value={weeklyEventChests}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
  },
  title: { color: "#fff3d1", fontSize: 22, fontWeight: "800" },
  description: { color: "#bea17b", fontSize: 13, lineHeight: 19 },
  fields: { gap: 10 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 12,
  },
  fieldLabelRow: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldLabel: {
    minWidth: 0,
    flex: 1,
    color: "#f4ddb0",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    width: 92,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#75462a",
    backgroundColor: "#20120d",
    color: "#fff8e7",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 12,
  },
});
