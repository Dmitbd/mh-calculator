import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  summonRivalryResourceCatalog,
  type SummonRivalryResourceMetadata,
} from "@/features/game-data/summon-rivalry";

import type { SummonPurchaseCosts } from "../model/types";
import { SummonResourceIcon } from "./SummonResourceIcon";

type SummonDiamondExchangeProps = {
  commonScrolls: number;
  limitedScrolls: number;
  fateCrystals: number;
  costs: SummonPurchaseCosts;
  onDecrementCommonScrolls: () => void;
  onIncrementCommonScrolls: () => void;
  onDecrementLimitedScrolls: () => void;
  onIncrementLimitedScrolls: () => void;
  onDecrementFateCrystals: () => void;
  onIncrementFateCrystals: () => void;
};

type ExchangeRowProps = {
  count: number;
  cost: number;
  resource: SummonRivalryResourceMetadata;
  controlName: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

type StepButtonProps = {
  disabled?: boolean;
  label: string;
  symbol: "−" | "+";
  onPress: () => void;
};

function StepButton({ disabled = false, label, symbol, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.stepButtonText, disabled && styles.disabledText]}>
        {symbol}
      </Text>
    </Pressable>
  );
}

function ExchangeRow({
  count,
  cost,
  resource,
  controlName,
  onDecrement,
  onIncrement,
}: ExchangeRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${resource.label}: ${count}, стоимость ${cost} алмазов`}
      style={styles.exchangeRow}
    >
      <View style={styles.resourceIdentity}>
        <SummonResourceIcon resource={resource} size={42} />
        <Text numberOfLines={2} style={styles.resourceLabel}>
          {resource.label}
        </Text>
      </View>
      <View style={styles.controls}>
        <StepButton
          disabled={count === 0}
          label={`Уменьшить ${controlName}`}
          onPress={onDecrement}
          symbol="−"
        />
        <Text style={styles.count}>{count}</Text>
        <StepButton
          label={`Увеличить ${controlName}`}
          onPress={onIncrement}
          symbol="+"
        />
      </View>
      <Text style={styles.rowCost}>{cost} алмазов</Text>
    </View>
  );
}

export function SummonDiamondExchange({
  commonScrolls,
  limitedScrolls,
  fateCrystals,
  costs,
  onDecrementCommonScrolls,
  onIncrementCommonScrolls,
  onDecrementLimitedScrolls,
  onIncrementLimitedScrolls,
  onDecrementFateCrystals,
  onIncrementFateCrystals,
}: SummonDiamondExchangeProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Обмен алмазов на призывы</Text>
      <View
        accessible
        accessibilityLabel={`Затраты алмазов: ${costs.total}`}
        style={styles.total}
      >
        <SummonResourceIcon
          resource={summonRivalryResourceCatalog.diamond}
          size={38}
        />
        <Text style={styles.totalText}>Затраты алмазов: {costs.total}</Text>
      </View>
      <Text style={styles.description}>
        Количество меняется наборами по 10.
      </Text>
      <View style={styles.exchangeList}>
        <ExchangeRow
          controlName="свитки обычного призыва"
          cost={costs.commonScrolls}
          count={commonScrolls}
          onDecrement={onDecrementCommonScrolls}
          onIncrement={onIncrementCommonScrolls}
          resource={summonRivalryResourceCatalog.commonScroll}
        />
        <ExchangeRow
          controlName="свитки ограниченного призыва"
          cost={costs.limitedScrolls}
          count={limitedScrolls}
          onDecrement={onDecrementLimitedScrolls}
          onIncrement={onIncrementLimitedScrolls}
          resource={summonRivalryResourceCatalog.limitedScroll}
        />
        <ExchangeRow
          controlName="кристаллы судьбы"
          cost={costs.fateCrystals}
          count={fateCrystals}
          onDecrement={onDecrementFateCrystals}
          onIncrement={onIncrementFateCrystals}
          resource={summonRivalryResourceCatalog.fateCrystal}
        />
      </View>
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
    gap: 12,
  },
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
  },
  total: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 10,
    gap: 10,
  },
  totalText: {
    minWidth: 0,
    flexShrink: 1,
    color: "#f0c36a",
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    color: "#bea17b",
    fontSize: 13,
  },
  exchangeList: {
    gap: 10,
  },
  exchangeRow: {
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 10,
    gap: 8,
  },
  resourceIdentity: {
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
    justifyContent: "center",
    gap: 12,
  },
  stepButton: {
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
  stepButtonText: {
    color: "#fff3d1",
    fontSize: 23,
    fontWeight: "800",
  },
  disabledText: {
    color: "#8e7c6a",
  },
  count: {
    minWidth: 48,
    color: "#fff8e7",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  rowCost: {
    color: "#f0c36a",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
