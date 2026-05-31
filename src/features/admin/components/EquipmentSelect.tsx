import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconPreview } from "./IconPreview";

/** Элемент справочника экипировки для выбора (артефакт или руна) */
export type EquipmentOption = {
  /** Уникальный id элемента */
  id: string;
  /** Название для UI */
  name: string;
  /** Путь к иконке */
  icon: string;
  /** Описание эффекта */
  description: string;
  /** Эффект резонанса (только у рун) */
  elementalResonance?: string;
};

type EquipmentSelectProps = {
  /** Заголовок строки */
  label: string;
  /** Текст-подсказка, когда ничего не выбрано */
  placeholder: string;
  /** Список доступных элементов */
  options: readonly EquipmentOption[];
  /** Id выбранного элемента или null */
  selectedId: string | null;
  /** Выбрать элемент */
  onSelect: (id: string) => void;
  /** Сбросить выбор */
  onClear: () => void;
};

/**
 * Блок выбора экипировки (мобильная раскладка): сверху — ячейка с выпадающим
 * списком (иконка + имя), ниже — описание выбранного элемента (и резонанс для рун).
 */
export function EquipmentSelect({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  onClear,
}: EquipmentSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId],
  );

  const toggleOpen = useCallback(() => setOpen((current) => !current), []);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onClear();
    setOpen(false);
  }, [onClear]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.pickerCell}>
          <Pressable
            accessibilityLabel={`Choose ${label}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={toggleOpen}
            style={styles.selectButton}
          >
            <IconPreview
              label={selected?.name ?? label}
              size={30}
              source={selected?.icon ?? null}
            />
            <Text numberOfLines={1} style={styles.selectText}>
              {selected?.name ?? placeholder}
            </Text>
          </Pressable>

          {selected ? (
            <Pressable
              accessibilityLabel={`Clear ${label}`}
              accessibilityRole="button"
              onPress={handleClear}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          ) : null}

          {open ? (
            <View style={styles.dropdown}>
              {options.map((option) => (
                <Pressable
                  accessibilityLabel={`Select ${option.name}`}
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => handleSelect(option.id)}
                  style={styles.option}
                >
                  <IconPreview label={option.name} size={26} source={option.icon} />
                  <Text numberOfLines={1} style={styles.optionText}>
                    {option.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.descriptionCell}>
          {selected ? (
            <View style={styles.descriptionBlock}>
              <Text style={styles.descriptionText}>{selected.description}</Text>
              {selected.elementalResonance ? (
                <Text style={styles.resonanceText}>
                  Elemental Resonance — {selected.elementalResonance}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.descriptionPlaceholder}>Информация о предмете</Text>
          )}
        </View>
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
  row: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  pickerCell: {
    width: "100%",
  },
  selectButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#241610",
    paddingHorizontal: 12,
  },
  selectText: {
    flex: 1,
    color: "#fff8ed",
    fontSize: 15,
    fontWeight: "700",
  },
  clearButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#3a241a",
  },
  clearButtonText: {
    color: "#f3d9b3",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 17,
  },
  dropdown: {
    gap: 6,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#1a100c",
    padding: 8,
  },
  option: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  optionText: {
    flex: 1,
    color: "#f7dfac",
    fontSize: 13,
    fontWeight: "700",
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
