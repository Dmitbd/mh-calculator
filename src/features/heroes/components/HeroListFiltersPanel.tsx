import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { IconPreview } from "@/features/admin/components/IconPreview";
import {
  heroElements,
  heroFactions,
  heroRoles,
} from "@/features/game-data/heroes/heroDictionaries";
import type {
  HeroDictionaryEntry,
  HeroElement,
  HeroFaction,
  HeroRole,
} from "@/features/heroes/types/heroes.types";
import type { HeroListFilters } from "@/features/heroes/utils/heroListFilters";

type HeroListFiltersProps = {
  /** Текущие значения фильтров */
  filters: HeroListFilters;
  /** Обработчик изменения фильтров */
  onChange: (filters: HeroListFilters) => void;
};

type FilterChipGroupProps<T extends string> = {
  /** Заголовок группы */
  label: string;
  /** Все варианты */
  options: HeroDictionaryEntry[];
  /** Текущее значение или null */
  value: T | null;
  /** Обработчик выбора */
  onSelect: (value: T | null) => void;
  /** Показывать иконку вместо текста */
  useIcon?: boolean;
};

/** Размер иконки в чипе и итоговый размер кнопки */
const CHIP_ICON_SIZE = 24;
const CHIP_DIMENSION = CHIP_ICON_SIZE + 16;

/** Горизонтальная группа чипов-фильтров */
function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onSelect,
  useIcon = false,
}: FilterChipGroupProps<T>) {
  const chipStyle = useIcon ? styles.chipIcon : styles.chipTextOnly;

  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>
        <Pressable
          accessibilityLabel={`${label}: все`}
          accessibilityRole="button"
          accessibilityState={{ selected: value === null }}
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            chipStyle,
            value === null && styles.chipSelected,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              useIcon && styles.chipTextIcon,
              value === null && styles.chipTextSelected,
            ]}
          >
            Все
          </Text>
        </Pressable>
        {options.map((option) => {
          const selected = value === option.id;

          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.name.ru}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => onSelect(option.id as T)}
              style={[
                styles.chip,
                useIcon ? styles.chipIcon : styles.chipTextOnly,
                selected && styles.chipSelected,
              ]}
            >
              {useIcon ? (
                <IconPreview
                  label={option.name.ru}
                  size={CHIP_ICON_SIZE}
                  source={option.icon}
                />
              ) : (
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {option.name.ru}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Панель фильтров списка героев */
export function HeroListFiltersPanel({ filters, onChange }: HeroListFiltersProps) {
  const updateFilters = (patch: Partial<HeroListFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        accessibilityLabel="Поиск героя"
        onChangeText={(search) => updateFilters({ search })}
        placeholder="Поиск по имени"
        placeholderTextColor="#8a735f"
        style={styles.searchInput}
        value={filters.search}
      />

      <FilterChipGroup<HeroRole>
        label="Роль"
        onSelect={(roleId) => updateFilters({ roleId })}
        options={heroRoles}
        useIcon
        value={filters.roleId}
      />

      <FilterChipGroup<HeroFaction>
        label="Фракция"
        onSelect={(factionId) => updateFilters({ factionId })}
        options={heroFactions}
        useIcon
        value={filters.factionId}
      />

      <FilterChipGroup<HeroElement>
        label="Стихия"
        onSelect={(elementId) => updateFilters({ elementId })}
        options={heroElements}
        useIcon
        value={filters.elementId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#1d130f",
    color: "#fff4d7",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    color: "#caa877",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#241610",
  },
  chipTextOnly: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipIcon: {
    width: CHIP_DIMENSION,
    height: CHIP_DIMENSION,
  },
  chipSelected: {
    borderColor: "#caa877",
    backgroundColor: "#3a2818",
  },
  chipText: {
    color: "#d7c19a",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  chipTextIcon: {
    lineHeight: CHIP_ICON_SIZE,
  },
  chipTextSelected: {
    color: "#fff4d7",
  },
});
