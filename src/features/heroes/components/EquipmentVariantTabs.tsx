import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EquipmentOption } from "@/features/admin/components/EquipmentSelect";
import { IconPreview } from "@/shared/ui/IconPreview";

type EquipmentVariantTabsProps = {
  /** Заголовок секции */
  label: string;
  /** Справочник элементов */
  options: readonly EquipmentOption[];
  /** Рекомендованные id в порядке отображения */
  selectedIds: readonly string[];
};

/** Read-only вкладки вариантов экипировки с описанием выбранного элемента */
export function EquipmentVariantTabs({
  label,
  options,
  selectedIds,
}: EquipmentVariantTabsProps) {
  const [activeId, setActiveId] = useState<string | null>(selectedIds[0] ?? null);

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const resolvedActiveId = useMemo(() => {
    if (activeId && selectedIds.includes(activeId)) {
      return activeId;
    }

    return selectedIds[0] ?? null;
  }, [activeId, selectedIds]);

  const activeOption = resolvedActiveId ? optionsById.get(resolvedActiveId) ?? null : null;

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.tabRow}>
        {selectedIds.map((id) => {
          const option = optionsById.get(id);

          if (!option) {
            return null;
          }

          const selected = id === resolvedActiveId;

          return (
            <Pressable
              accessibilityLabel={`Select ${option.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => handleSelect(id)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <IconPreview label={option.name} size={22} source={option.icon} />
              <Text
                numberOfLines={1}
                style={[styles.tabText, selected && styles.tabTextActive]}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.descriptionCell}>
        {activeOption ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionText}>{activeOption.description}</Text>
            {activeOption.elementalResonance ? (
              <Text style={styles.resonanceText}>
                Elemental Resonance — {activeOption.elementalResonance}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.descriptionPlaceholder}>Информация о предмете</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#241610",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabActive: {
    borderColor: "#f0c36a",
    backgroundColor: "#3a2415",
  },
  tabText: {
    flexShrink: 1,
    color: "#d8c4a8",
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff6df",
    fontWeight: "800",
  },
  descriptionCell: {
    width: "100%",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a2a1d",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  descriptionBlock: {
    gap: 6,
  },
  descriptionText: {
    color: "#e9d6b6",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  resonanceText: {
    color: "#f0c36a",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  descriptionPlaceholder: {
    color: "#917968",
    fontSize: 13,
    fontWeight: "600",
  },
});
