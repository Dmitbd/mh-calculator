import { useState } from "react";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { divinityGemChests } from "@/features/game-data/divinity";
import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { divinityGemLevels } from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";
import { GemIcon } from "./GemIcon";

type DivinityResourcesPanelProps = {
  resources: DivinityOwnedResources;
  onIncrementChest: (chestId: DivinityGemChestId) => void;
  onDecrementChest: (chestId: DivinityGemChestId) => void;
  onIncrementGem: (level: DivinityGemLevel) => void;
  onDecrementGem: (level: DivinityGemLevel) => void;
  onReset: () => void;
};

type CounterRowProps = {
  addLabel: string;
  icon: ReactNode;
  label: string;
  removeLabel: string;
  value: number;
  onAdd: () => void;
  onRemove: () => void;
};

function CounterRow({
  addLabel,
  icon,
  label,
  removeLabel,
  value,
  onAdd,
  onRemove,
}: CounterRowProps) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterControls}>
        <Pressable
          accessibilityLabel={removeLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: value === 0 }}
          disabled={value === 0}
          onPress={onRemove}
          style={[styles.stepButton, value === 0 && styles.stepButtonDisabled]}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <View style={styles.resourceIdentity}>
          {icon}
          <Text numberOfLines={1} style={styles.resourceLabel}>
            {label}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={addLabel}
          accessibilityRole="button"
          onPress={onAdd}
          style={styles.stepButton}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.countBox}>
        <Text style={styles.countText}>{value}</Text>
      </View>
    </View>
  );
}

export function DivinityResourcesPanel({
  resources,
  onIncrementChest,
  onDecrementChest,
  onIncrementGem,
  onDecrementGem,
  onReset,
}: DivinityResourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={
          isExpanded ? "Свернуть мои ресурсы" : "Раскрыть мои ресурсы"
        }
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((current) => !current)}
        style={styles.header}
      >
        <Text style={styles.title}>Мои ресурсы</Text>
        <View style={styles.chevronBox}>
          <Text style={styles.chevron} testID="divinity-resources-chevron">
            {isExpanded ? "▴" : "▾"}
          </Text>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Сундуки</Text>
          {divinityGemChests.map((chest) => (
            <CounterRow
              key={chest.id}
              addLabel={`Добавить сундук ${chest.id}`}
              icon={
                <Image
                  accessibilityLabel={chest.name}
                  resizeMode="contain"
                  source={{ uri: resolveAssetUri(chest.icon) }}
                  style={styles.chestIcon}
                />
              }
              label={
                chest.id === "600001" ? "1–5 ур." : "6–7 ур."
              }
              removeLabel={`Убрать сундук ${chest.id}`}
              value={resources.chestCounts[chest.id]}
              onAdd={() => onIncrementChest(chest.id)}
              onRemove={() => onDecrementChest(chest.id)}
            />
          ))}

          <Text style={styles.sectionTitle}>Самоцветы</Text>
          {divinityGemLevels.map((level: DivinityGemLevel) => (
            <CounterRow
              key={level}
              addLabel={`Добавить самоцвет ${level} ур.`}
              icon={<GemIcon level={level} size={30} />}
              label={`${level} ур.`}
              removeLabel={`Убрать самоцвет ${level} ур.`}
              value={resources.gemCounts[level]}
              onAdd={() => onIncrementGem(level)}
              onRemove={() => onDecrementGem(level)}
            />
          ))}

          <Pressable
            accessibilityLabel="Сбросить мои ресурсы"
            accessibilityRole="button"
            onPress={onReset}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>Сбросить мои ресурсы</Text>
          </Pressable>
        </View>
      ) : null}
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
    overflow: "hidden",
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    outlineColor: "transparent",
    outlineStyle: "solid",
    outlineWidth: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff3d1",
  },
  chevron: {
    color: "#e9c46a",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 18,
  },
  chevronBox: {
    alignItems: "center",
    flexShrink: 0,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  content: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: "#e9c46a",
  },
  counterRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 8,
  },
  counterControls: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8b512f",
    backgroundColor: "#4b2818",
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  stepButtonText: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900",
    color: "#ffe09d",
  },
  resourceIdentity: {
    width: 64,
    flexShrink: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  resourceLabel: {
    width: "100%",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    color: "#f4ddb0",
  },
  chestIcon: {
    width: 42,
    height: 42,
  },
  countBox: {
    minWidth: 48,
    height: 40,
    marginLeft: "auto",
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#281710",
  },
  countText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff8e7",
  },
  resetButton: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8b512f",
    paddingVertical: 13,
    backgroundColor: "#351c11",
  },
  resetButtonText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#ffd8b0",
  },
});
