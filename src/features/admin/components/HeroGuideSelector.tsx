import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { heroFactions } from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/game-data/heroes/types";

import {
  getHeroGuideSelectorSections,
  type HeroGuideSelectorGroup,
} from "../model/heroGuideSelector";
import { IconPreview } from "@/shared/ui/IconPreview";

type HeroGuideSelectorProps = {
  error: string | null;
  heroes: readonly Hero[];
  isLoading: boolean;
  onRetry: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

export function HeroGuideSelector({
  error,
  heroes,
  isLoading,
  onRetry,
  onSelectHero,
  selectedHeroId,
}: HeroGuideSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sections = useMemo(
    () => getHeroGuideSelectorSections(heroes, heroFactions),
    [heroes],
  );

  if (isLoading) {
    return <Text style={styles.stateText}>Загружаем доступных героев...</Text>;
  }

  if (error) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateText}>
          Не удалось загрузить список опубликованных гайдов
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel="Выбрать героя"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((current) => !current)}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>Выбрать героя</Text>
        <Text style={styles.chevron}>{isExpanded ? "⌃" : "⌄"}</Text>
      </Pressable>

      {isExpanded ? (
        heroes.length === 0 ? (
          <Text style={styles.stateText}>Все герои уже имеют опубликованные гайды</Text>
        ) : (
          <View style={styles.content}>
            {sections.urHeroes.length > 0 ? (
              <HeroGrid
                heroes={sections.urHeroes}
                onSelectHero={onSelectHero}
                selectedHeroId={selectedHeroId}
                title="UR"
              />
            ) : null}
            {sections.ssrGroups.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SSR</Text>
                {sections.ssrGroups.map((group) => (
                  <FactionHeroGrid
                    group={group}
                    key={group.faction.id}
                    onSelectHero={onSelectHero}
                    selectedHeroId={selectedHeroId}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )
      ) : null}
    </View>
  );
}

type HeroGridProps = {
  heroes: readonly Hero[];
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
  title: string;
};

function HeroGrid({ heroes, onSelectHero, selectedHeroId, title }: HeroGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {heroes.map((hero) => (
          <HeroOption
            hero={hero}
            key={hero.id}
            onSelectHero={onSelectHero}
            selectedHeroId={selectedHeroId}
          />
        ))}
      </View>
    </View>
  );
}

type FactionHeroGridProps = {
  group: HeroGuideSelectorGroup;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

function FactionHeroGrid({ group, onSelectHero, selectedHeroId }: FactionHeroGridProps) {
  return (
    <View style={styles.factionSection}>
      <Text style={styles.factionTitle}>{group.faction.name.ru}</Text>
      <View style={styles.grid}>
        {group.heroes.map((hero) => (
          <HeroOption
            hero={hero}
            key={hero.id}
            onSelectHero={onSelectHero}
            selectedHeroId={selectedHeroId}
          />
        ))}
      </View>
    </View>
  );
}

type HeroOptionProps = {
  hero: Hero;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

function HeroOption({ hero, onSelectHero, selectedHeroId }: HeroOptionProps) {
  const isSelected = hero.id === selectedHeroId;

  return (
    <Pressable
      accessibilityLabel={
        isSelected ? `Герой ${hero.name.ru} выбран` : `Выбрать героя ${hero.name.ru}`
      }
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => {
        if (!isSelected) {
          onSelectHero(hero.id);
        }
      }}
      style={[styles.option, isSelected ? styles.optionSelected : null]}
    >
      <IconPreview label={hero.name.ru} size={56} source={hero.icon} />
      <Text numberOfLines={1} style={styles.optionName}>
        {hero.name.ru}
      </Text>
      {isSelected ? (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  toggle: {
    alignItems: "center",
    backgroundColor: "#241610",
    borderColor: "#644932",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleText: {
    color: "#fff8ed",
    fontSize: 16,
    fontWeight: "700",
  },
  chevron: {
    color: "#f3d9b3",
    fontSize: 18,
    fontWeight: "800",
  },
  content: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
  },
  factionSection: {
    gap: 6,
  },
  factionTitle: {
    color: "#a89274",
    fontSize: 12,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    alignItems: "center",
    borderColor: "#533b29",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 4,
    position: "relative",
    width: 72,
  },
  optionSelected: {
    borderColor: "#caa877",
  },
  optionName: {
    color: "#f7dfac",
    fontSize: 11,
    fontWeight: "700",
    width: "100%",
  },
  selectedBadge: {
    alignItems: "center",
    backgroundColor: "#caa877",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    top: 2,
    width: 18,
  },
  selectedBadgeText: {
    color: "#241610",
    fontSize: 12,
    fontWeight: "900",
  },
  stateCard: {
    backgroundColor: "#241610",
    borderColor: "#644932",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  stateText: {
    color: "#a89274",
    fontSize: 13,
    fontWeight: "600",
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#3a241a",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: "#f3d9b3",
    fontSize: 13,
    fontWeight: "800",
  },
});
