import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { heroFactions } from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/game-data/heroes/types";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";
import { IconPreview } from "@/shared/ui/IconPreview";

import {
  getHeroGuideSelectorSections,
  type HeroGuideSelectorGroup,
} from "../model/heroGuideSelector";

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
  const selectedHero = selectedHeroId
    ? heroes.find((hero) => hero.id === selectedHeroId) ?? null
    : null;

  return (
    <View style={styles.wrapper}>
      {!error ? (
        <Pressable
          accessibilityLabel={
            isLoading
              ? "Загрузка героев"
              : selectedHero
              ? `Изменить героя: ${selectedHero.name.ru}`
              : "Выбрать героя"
          }
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setIsExpanded((current) => !current)}
          style={[styles.toggle, isExpanded ? styles.toggleExpanded : null]}
        >
          {isLoading ? (
            <View style={styles.loadingHeader}>
              <ActivityIndicator
                accessibilityLabel="Загрузка героев"
                color="#d6c2a4"
                size="small"
              />
              <Text style={styles.toggleText}>Загрузка героев</Text>
            </View>
          ) : selectedHero ? (
            <View style={styles.toggleHero}>
              <Image
                accessibilityLabel={`${selectedHero.name.ru} selected hero`}
                source={{ uri: resolveAssetUri(selectedHero.icon) }}
                style={styles.toggleHeroPortrait}
              />
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.toggleHeroName}
              >
                {selectedHero.name.ru}
              </Text>
            </View>
          ) : (
            <Text style={styles.toggleText}>Выбрать героя</Text>
          )}
          <View
            style={[
              styles.chevronBox,
              isExpanded ? styles.chevronExpanded : styles.chevronCollapsed,
            ]}
            testID="hero-selector-chevron-box"
          >
            <Text style={styles.chevron} testID="hero-selector-chevron">
              ›
            </Text>
          </View>
        </Pressable>
      ) : null}

      {selectedHero && error ? (
        <View style={styles.grid}>
          <HeroOption
            hero={selectedHero}
            onSelectHero={onSelectHero}
            selectedHeroId={selectedHeroId}
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.stateCard}>
          <Text accessibilityLiveRegion="polite" style={styles.stateText}>
            Не удалось загрузить список опубликованных гайдов
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      ) : isExpanded ? (
        <View style={styles.expandedContent} testID="hero-selector-content">
          {isLoading ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator
                accessibilityLabel="Загрузка списка героев"
                color="#d6c2a4"
                size="small"
              />
            </View>
          ) : heroes.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.stateText}>
              Все герои уже имеют опубликованные гайды
            </Text>
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
          )}
        </View>
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
      <View style={styles.factionHeader}>
        <IconPreview
          label={group.faction.name.ru}
          size={20}
          source={group.faction.icon}
        />
        <Text style={styles.factionTitle}>{group.faction.name.ru}</Text>
      </View>
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
      <View style={styles.portrait} testID={`hero-portrait-${hero.id}`}>
        {hero.icon ? (
          <Image
            accessibilityLabel={`${hero.name.ru} portrait`}
            source={{ uri: resolveAssetUri(hero.icon) }}
            style={styles.portraitImage}
          />
        ) : (
          <View
            accessibilityLabel={`${hero.name.ru} portrait placeholder`}
            style={styles.portraitPlaceholder}
          />
        )}
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>✓</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.optionName}>
        {getWrappedHeroName(hero.name.ru)}
      </Text>
    </Pressable>
  );
}

function getWrappedHeroName(name: string) {
  const words = name.trim().split(/\s+/);

  if (words.length < 3) {
    return name;
  }

  return `${words.slice(0, -2).join(" ")}\n${words.slice(-2).join(" ")}`;
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
  toggleExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  toggleText: {
    color: "#d6c2a4",
    fontSize: 16,
    fontWeight: "700",
  },
  toggleHero: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  toggleHeroName: {
    color: "#d6c2a4",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 0,
  },
  loadingHeader: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  toggleHeroPortrait: {
    backgroundColor: "#271610",
    borderRadius: 4,
    height: 32,
    width: 32,
  },
  chevron: {
    color: "#f3d9b3",
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
    gap: 12,
  },
  expandedContent: {
    backgroundColor: "#241610",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderColor: "#644932",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    marginTop: -9,
    padding: 16,
  },
  loadingPanel: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
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
  factionHeader: {
    alignItems: "center",
    flexDirection: "row",
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
    height: 112,
    padding: 8,
    position: "relative",
    width: 104,
  },
  optionSelected: {
    borderColor: "#caa877",
  },
  optionName: {
    color: "#f7dfac",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
    width: "100%",
  },
  portrait: {
    borderRadius: 6,
    height: 56,
    position: "relative",
    width: 56,
  },
  portraitImage: {
    backgroundColor: "#271610",
    borderRadius: 6,
    height: 56,
    width: 56,
  },
  portraitPlaceholder: {
    backgroundColor: "transparent",
    borderColor: "#6b5645",
    borderRadius: 6,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 56,
    width: 56,
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
