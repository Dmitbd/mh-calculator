import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EquipmentOption } from "./EquipmentSelect";
import { IconPreview } from "./IconPreview";

type EquipmentVariantBuilderProps = {
  /** Заголовок секции */
  label: string;
  /** Подпись кнопки добавления */
  addLabel: string;
  /** Справочник доступных элементов */
  options: readonly EquipmentOption[];
  /** Выбранные id в порядке добавления */
  selectedIds: readonly string[];
  /** Добавить вариант */
  onAdd: (id: string) => void;
  /** Удалить вариант */
  onRemove: (id: string) => void;
};

/** Блок добавления и удаления вариантов экипировки в билдере */
export function EquipmentVariantBuilder({
  label,
  addLabel,
  options,
  selectedIds,
  onAdd,
  onRemove,
}: EquipmentVariantBuilderProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const availableOptions = useMemo(
    () => options.filter((option) => !selectedIds.includes(option.id)),
    [options, selectedIds],
  );

  const toggleCatalog = useCallback(() => {
    setCatalogOpen((current) => !current);
  }, []);

  const handleAdd = useCallback(
    (id: string) => {
      onAdd(id);
      setCatalogOpen(false);
    },
    [onAdd],
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.chipRow}>
        {selectedIds.map((id) => {
          const option = optionsById.get(id);

          if (!option) {
            return null;
          }

          return (
            <View key={id} style={styles.chip}>
              <IconPreview label={option.name} size={24} source={option.icon} />
              <Text numberOfLines={1} style={styles.chipText}>
                {option.name}
              </Text>
              <Pressable
                accessibilityLabel={`Remove ${option.name}`}
                accessibilityRole="button"
                onPress={() => onRemove(id)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable
          accessibilityLabel={addLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: catalogOpen }}
          onPress={toggleCatalog}
          style={styles.addButton}
        >
          <View style={styles.addButtonInner}>
            <View style={styles.addButtonIcon}>
              <View style={styles.addButtonBarHorizontal} />
              <View style={styles.addButtonBarVertical} />
            </View>
          </View>
        </Pressable>
      </View>

      {catalogOpen ? (
        <View style={styles.catalog}>
          {availableOptions.length === 0 ? (
            <Text style={styles.catalogEmpty}>Все варианты уже добавлены</Text>
          ) : (
            availableOptions.map((option) => (
              <Pressable
                accessibilityLabel={`Add ${option.name}`}
                accessibilityRole="button"
                key={option.id}
                onPress={() => handleAdd(option.id)}
                style={styles.catalogOption}
              >
                <IconPreview label={option.name} size={26} source={option.icon} />
                <Text numberOfLines={1} style={styles.catalogOptionText}>
                  {option.name}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    maxWidth: "100%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#241610",
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
  },
  chipText: {
    flexShrink: 1,
    color: "#fff8ed",
    fontSize: 13,
    fontWeight: "700",
  },
  removeButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#3a241a",
  },
  removeButtonText: {
    color: "#f3d9b3",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  addButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#1a100c",
  },
  addButtonInner: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonBarHorizontal: {
    position: "absolute",
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#f0c36a",
  },
  addButtonBarVertical: {
    position: "absolute",
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: "#f0c36a",
  },
  catalog: {
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#1a100c",
    padding: 8,
  },
  catalogEmpty: {
    color: "#917968",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  catalogOption: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  catalogOptionText: {
    flex: 1,
    color: "#f7dfac",
    fontSize: 13,
    fontWeight: "700",
  },
});
