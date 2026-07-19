import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { divinityGemChests } from "@/features/game-data/divinity";
import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import {
  divinityGemLevels,
  normalizeDivinityResourceCount,
} from "../model/divinityOwnedResources";
import type { DivinityOwnedResources } from "../model/types";
import { GemIcon } from "./GemIcon";

type DivinityResourcesPanelProps = {
  resources: DivinityOwnedResources;
  onSetChest: (chestId: DivinityGemChestId, count: number) => void;
  onSetGem: (level: DivinityGemLevel, count: number) => void;
  onReset: () => void;
};

type CounterRowProps = {
  clearLabel: string;
  icon: ReactNode;
  inputLabel: string;
  label: string;
  saveLabel: string;
  value: number;
  onChange: (count: number) => void;
};

function TrashIcon() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14m-7 4v6m4-6v6"
        fill="none"
        stroke="#ffe09d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function CounterRow({
  clearLabel,
  icon,
  inputLabel,
  label,
  saveLabel,
  value,
  onChange,
}: CounterRowProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const isDirty = draft !== String(value);

  const saveDraft = () => {
    if (!isDirty) {
      return;
    }

    const normalized = normalizeDivinityResourceCount(
      draft === "" ? 0 : Number(draft),
    );
    setDraft(String(normalized));
    onChange(normalized);
  };

  const clearValue = () => {
    setDraft("0");
    onChange(0);
  };

  return (
    <View style={styles.counterRow}>
      <View style={styles.resourceIdentity}>
        {icon}
        <Text numberOfLines={1} style={styles.resourceLabel}>
          {label}
        </Text>
      </View>

      <View style={styles.countEditor}>
        <TextInput
          accessibilityLabel={inputLabel}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={3}
          onChangeText={(text) => {
            setDraft(text.replace(/\D/g, "").slice(0, 3));
          }}
          onSubmitEditing={saveDraft}
          selectTextOnFocus
          style={styles.countInput}
          value={draft}
        />
        <View style={styles.countActionSlot}>
          {isDirty ? (
            <Pressable
              accessibilityLabel={saveLabel}
              accessibilityRole="button"
              onPress={saveDraft}
              style={styles.countAction}
            >
              <Text style={styles.confirmIcon}>✓</Text>
            </Pressable>
          ) : value > 0 ? (
            <Pressable
              accessibilityLabel={clearLabel}
              accessibilityRole="button"
              onPress={clearValue}
              style={styles.countAction}
            >
              <TrashIcon />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function DivinityResourcesPanel({
  resources,
  onSetChest,
  onSetGem,
  onReset,
}: DivinityResourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  const resetPanelResources = () => {
    setResetVersion((current) => current + 1);
    onReset();
  };

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
        <View
          style={[
            styles.chevronBox,
            isExpanded ? styles.chevronExpanded : styles.chevronCollapsed,
          ]}
        >
          <Text style={styles.chevron} testID="divinity-resources-chevron">
            ›
          </Text>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Сундуки</Text>
          {divinityGemChests.map((chest) => (
            <CounterRow
              key={`${chest.id}-${resetVersion}`}
              clearLabel={`Очистить сундуки ${chest.id}`}
              icon={
                <Image
                  accessibilityLabel={chest.name}
                  resizeMode="contain"
                  source={{ uri: resolveAssetUri(chest.icon) }}
                  style={styles.chestIcon}
                />
              }
              inputLabel={`Количество сундуков ${chest.id}`}
              label={chest.id === "600001" ? "1–5 ур." : "6–7 ур."}
              saveLabel={`Сохранить сундуки ${chest.id}`}
              value={resources.chestCounts[chest.id]}
              onChange={(count) => onSetChest(chest.id, count)}
            />
          ))}

          <Text style={styles.sectionTitle}>Самоцветы</Text>
          {divinityGemLevels.map((level: DivinityGemLevel) => (
            <CounterRow
              key={`${level}-${resetVersion}`}
              clearLabel={`Очистить самоцветы ${level} ур.`}
              icon={<GemIcon level={level} size={30} />}
              inputLabel={`Количество самоцветов ${level} ур.`}
              label={`${level} ур.`}
              saveLabel={`Сохранить самоцветы ${level} ур.`}
              value={resources.gemCounts[level]}
              onChange={(count) => onSetGem(level, count)}
            />
          ))}

          <Pressable
            accessibilityLabel="Сбросить мои ресурсы"
            accessibilityRole="button"
            onPress={resetPanelResources}
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
  chevronCollapsed: {
    transform: [{ rotate: "90deg" }],
  },
  chevronExpanded: {
    transform: [{ rotate: "-90deg" }],
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
  resourceIdentity: {
    width: 64,
    flexShrink: 0,
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
  countEditor: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  countInput: {
    width: 80,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6f4028",
    backgroundColor: "#281710",
    color: "#fff8e7",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  countActionSlot: {
    width: 40,
    height: 40,
  },
  countAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8b512f",
    backgroundColor: "#4b2818",
  },
  confirmIcon: {
    color: "#ffe09d",
    fontSize: 22,
    fontWeight: "900",
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
