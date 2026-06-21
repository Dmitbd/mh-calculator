import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  getDictionaryEntry,
  heroRarities,
} from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/game-data/heroes/types";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { IconPreview } from "@/shared/ui/IconPreview";
import { searchHeroCatalog } from "../utils/searchHeroCatalog";

type HeroSelectInputProps = {
  /** Каталог героев для поиска */
  heroes: readonly Hero[];
  /** Текущий поисковый запрос */
  heroQuery: string;
  /** Id выбранного героя или null */
  selectedHeroId: string | null;
  /** Изменение поискового запроса */
  onQueryChange: (value: string) => void;
  /** Выбор героя из выпадающего списка */
  onSelectHero: (heroId: string) => void;
  /** Сброс выбранного героя */
  onClearHero?: () => void;
};

/** Поле выбора героя из локального каталога с поиском */
export function HeroSelectInput({
  heroes,
  heroQuery,
  selectedHeroId,
  onQueryChange,
  onSelectHero,
  onClearHero,
}: HeroSelectInputProps) {
  const selectedHero = useMemo(
    () => heroes.find((hero) => hero.id === selectedHeroId) ?? null,
    [heroes, selectedHeroId],
  );

  const matchingHeroes = useMemo(
    () => searchHeroCatalog(heroes, heroQuery),
    [heroes, heroQuery],
  );

  const isSelected = selectedHeroId !== null && selectedHero !== null;
  const showDropdown = heroQuery.trim().length > 0 && !isSelected;

  const handleClearHero = () => {
    onClearHero?.();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Герой</Text>

      <View style={[styles.inputRow, isSelected ? styles.inputRowSelected : null]}>
        {selectedHero ? (
          <IconPreview label={selectedHero.name.ru} size={28} source={selectedHero.icon} />
        ) : null}

        <TextInput
          accessibilityLabel="Герой"
          accessibilityState={{ selected: isSelected }}
          onChangeText={onQueryChange}
          placeholder="Начните вводить имя героя"
          placeholderTextColor="#917968"
          style={styles.input}
          value={heroQuery}
        />

        {isSelected ? (
          <Pressable
            accessibilityLabel="Очистить выбранного героя"
            accessibilityRole="button"
            onPress={handleClearHero}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          {matchingHeroes.length > 0 ? (
            matchingHeroes.map((hero) => (
              <HeroDropdownOption hero={hero} key={hero.id} onSelect={onSelectHero} />
            ))
          ) : (
            <Text style={styles.emptyText}>Герой не найден</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

type HeroDropdownOptionProps = {
  hero: Hero;
  onSelect: (heroId: string) => void;
};

/** Строка героя в выпадающем списке */
function HeroDropdownOption({ hero, onSelect }: HeroDropdownOptionProps) {
  const rarity = getDictionaryEntry(heroRarities, hero.rarity);

  const handlePress = () => {
    onSelect(hero.id);
  };

  return (
    <Pressable
      accessibilityLabel={`Выбрать героя ${hero.name.ru}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.option}
    >
      <IconPreview label={hero.name.ru} size={26} source={hero.icon} />

      <View style={styles.optionTextBlock}>
        <Text numberOfLines={1} style={styles.optionName}>
          {hero.name.ru}
        </Text>
        <Text numberOfLines={1} style={styles.optionSecondary}>
          {hero.name.en}
        </Text>
      </View>

      {rarity ? (
        <Image
          accessibilityLabel={`${rarity.name.ru} rarity`}
          resizeMode="contain"
          source={{ uri: resolveAssetUri(rarity.icon) }}
          style={styles.rarityBadge}
        />
      ) : (
        <Text style={styles.rarityText}>{hero.rarity.toUpperCase()}</Text>
      )}
    </Pressable>
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
  inputRow: {
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
  inputRowSelected: {
    borderColor: "#caa877",
    backgroundColor: "#2a1a12",
  },
  input: {
    flex: 1,
    color: "#fff8ed",
    fontSize: 16,
    paddingVertical: 10,
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#3a241a",
  },
  clearButtonText: {
    color: "#f3d9b3",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  dropdown: {
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#1a100c",
    padding: 8,
  },
  option: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  optionTextBlock: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    color: "#f7dfac",
    fontSize: 14,
    fontWeight: "700",
  },
  optionSecondary: {
    color: "#a89274",
    fontSize: 12,
    fontWeight: "600",
  },
  rarityBadge: {
    height: 18,
    width: 36,
  },
  rarityText: {
    color: "#caa877",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyText: {
    color: "#917968",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
