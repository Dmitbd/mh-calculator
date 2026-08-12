import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { antiqueResourceCatalog } from "@/features/game-data/antiques";

import type {
  AntiqueCoinAllocation as AntiqueCoinAllocationValue,
} from "../model/types";
import { AntiqueResourceIcon } from "./AntiqueResourceIcon";

type AntiqueCoinAllocationProps = {
  allocation: AntiqueCoinAllocationValue;
  canConvertToTemple: boolean;
  canConvertToTombs: boolean;
  coins: number;
  onChangeCoins: (text: string) => void;
  onConvertToTemple: () => void;
  onConvertToTombs: () => void;
};

type AllocationRowProps = {
  count: number;
  decreaseDisabled: boolean;
  decreaseLabel: string;
  increaseDisabled: boolean;
  increaseLabel: string;
  resource:
    | typeof antiqueResourceCatalog.tombMap
    | typeof antiqueResourceCatalog.templeMap;
  onDecrease: () => void;
  onIncrease: () => void;
};

type ConversionButtonProps = {
  disabled: boolean;
  label: string;
  symbol: "−" | "+";
  onPress: () => void;
};

function ConversionButton({
  disabled,
  label,
  symbol,
  onPress,
}: ConversionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.conversionButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.buttonText, disabled && styles.disabledButtonText]}>
        {symbol}
      </Text>
    </Pressable>
  );
}

function AllocationRow({
  count,
  decreaseDisabled,
  decreaseLabel,
  increaseDisabled,
  increaseLabel,
  resource,
  onDecrease,
  onIncrease,
}: AllocationRowProps) {
  return (
    <View style={styles.allocationRow}>
      <View style={styles.resourceIdentity}>
        <AntiqueResourceIcon resource={resource} size={38} />
        <Text style={styles.resourceLabel}>{resource.label}</Text>
      </View>
      <View style={styles.controls}>
        <ConversionButton
          disabled={decreaseDisabled}
          label={decreaseLabel}
          symbol="−"
          onPress={onDecrease}
        />
        <Text
          accessibilityLabel={`${resource.label.replace("Карта", "Карт")}: ${count}`}
          style={styles.count}
        >
          {count}
        </Text>
        <ConversionButton
          disabled={increaseDisabled}
          label={increaseLabel}
          symbol="+"
          onPress={onIncrease}
        />
      </View>
    </View>
  );
}

export function AntiqueCoinAllocation({
  allocation,
  canConvertToTemple,
  canConvertToTombs,
  coins,
  onChangeCoins,
  onConvertToTemple,
  onConvertToTombs,
}: AntiqueCoinAllocationProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Монеты исследования</Text>
      <View style={styles.coinField}>
        <AntiqueResourceIcon
          resource={antiqueResourceCatalog.researchCoins}
          size={42}
        />
        <View style={styles.inputColumn}>
          <Text style={styles.inputLabel}>Количество монет</Text>
          <TextInput
            accessibilityLabel="Количество монет исследования"
            keyboardType="number-pad"
            onChangeText={onChangeCoins}
            selectTextOnFocus
            style={styles.input}
            value={String(coins)}
          />
        </View>
      </View>
      <Text style={styles.unusedCoins}>Обмен монет на карты</Text>

      <View style={styles.allocationList}>
        <AllocationRow
          count={allocation.tombMaps}
          decreaseDisabled={!canConvertToTemple}
          decreaseLabel="Уменьшить карты гробницы"
          increaseDisabled={!canConvertToTombs}
          increaseLabel="Увеличить карты гробницы"
          resource={antiqueResourceCatalog.tombMap}
          onDecrease={onConvertToTemple}
          onIncrease={onConvertToTombs}
        />
        <AllocationRow
          count={allocation.templeMaps}
          decreaseDisabled={!canConvertToTombs}
          decreaseLabel="Уменьшить карты храма"
          increaseDisabled={!canConvertToTemple}
          increaseLabel="Увеличить карты храма"
          resource={antiqueResourceCatalog.templeMap}
          onDecrease={onConvertToTombs}
          onIncrease={onConvertToTemple}
        />
      </View>
      <Text style={styles.hint}>
        2 карты гробницы = 1 карта храма. Цена и очки не меняются.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 14,
  },
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
  },
  coinField: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  inputColumn: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: "#d7c19a",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    width: "100%",
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#75462a",
    backgroundColor: "#20120d",
    color: "#fff8e7",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 14,
  },
  unusedCoins: {
    color: "#bea17b",
    fontSize: 13,
    fontWeight: "700",
  },
  allocationList: {
    gap: 10,
  },
  allocationRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 10,
  },
  resourceIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resourceLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: "#f4ddb0",
    fontSize: 14,
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  conversionButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#a16d32",
    backgroundColor: "#5a321c",
  },
  disabledButton: {
    borderColor: "#4b382d",
    backgroundColor: "#31251f",
    opacity: 0.48,
  },
  buttonText: {
    color: "#fff3d1",
    fontSize: 23,
    fontWeight: "800",
  },
  disabledButtonText: {
    color: "#8e7c6a",
  },
  count: {
    minWidth: 30,
    color: "#fff8e7",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  hint: {
    color: "#bea17b",
    fontSize: 12,
    lineHeight: 18,
  },
});
