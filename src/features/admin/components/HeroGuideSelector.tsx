import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { heroFactions } from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/game-data/heroes/types";
import { AppImage } from "@/shared/ui/AppImage";
import { IconPreview } from "@/shared/ui/IconPreview";
import { ScreenLoader } from "@/shared/ui/ScreenLoader";

import {
  getHeroGuideSelectorSections,
  type HeroGuideSelectorGroup,
  type HeroGuideSelectorSections,
} from "../model/heroGuideSelector";

type HeroGuideSelectorProps = {
  error: string | null;
  isDraftLoadPending: boolean;
  isLoading: boolean;
  notCreatedHeroes: readonly Hero[];
  notPublishedHeroes: readonly Hero[];
  onRetry: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHero: Hero | null;
  selectedHeroId: string | null;
};

export function HeroGuideSelector({
  error,
  isDraftLoadPending,
  isLoading,
  notCreatedHeroes,
  notPublishedHeroes,
  onRetry,
  onSelectHero,
  selectedHero,
  selectedHeroId,
}: HeroGuideSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.wrapper}>
      {!error ? (
        <Pressable
          accessibilityLabel={
            isDraftLoadPending
              ? "Загрузка черновика"
              : selectedHero
              ? `Изменить героя: ${selectedHero.name.ru}`
              : isLoading
              ? "Загрузка героев"
              : "Выбрать героя"
          }
          accessibilityRole="button"
          accessibilityState={{
            busy: isDraftLoadPending || isLoading,
            expanded: isExpanded,
          }}
          onPress={() => setIsExpanded((current) => !current)}
          style={[styles.toggle, isExpanded ? styles.toggleExpanded : null]}
        >
          {isDraftLoadPending ? (
            <View style={styles.loadingHeader}>
              <ActivityIndicator color="#d6c2a4" size="small" />
              <Text style={styles.toggleText}>Загружаем черновик...</Text>
            </View>
          ) : selectedHero ? (
            <View style={styles.toggleHero}>
              <AppImage
                accessibilityLabel={`${selectedHero.name.ru} selected hero`}
                borderRadius={4}
                height={32}
                source={selectedHero.icon}
                testID={`selected-hero-image-${selectedHero.id}`}
                width={32}
              />
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.toggleHeroName}
              >
                {selectedHero.name.ru}
              </Text>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingHeader}>
              <ActivityIndicator
                accessibilityLabel="Загрузка героев"
                color="#d6c2a4"
                size="small"
              />
              <Text style={styles.toggleText}>Загрузка героев</Text>
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
            disabled={isDraftLoadPending}
            hero={selectedHero}
            onSelectHero={onSelectHero}
            selectedHeroId={selectedHeroId}
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.stateCard}>
          <Text accessibilityLiveRegion="polite" style={styles.stateText}>
            Не удалось загрузить списки героев
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
            <ScreenLoader label="Загрузка списка героев" mode="inline" />
          ) : (
            <View style={styles.content}>
              <HeroCatalogList
                emptyText="Нет героев без черновика"
                heroes={notCreatedHeroes}
                isSelectionDisabled={isDraftLoadPending}
                onSelectHero={onSelectHero}
                selectedHeroId={selectedHeroId}
                title="Не созданы"
              />
              <HeroCatalogList
                emptyText="Нет неопубликованных героев"
                heroes={notPublishedHeroes}
                isSelectionDisabled={isDraftLoadPending}
                onSelectHero={onSelectHero}
                selectedHeroId={selectedHeroId}
                title="Не опубликованы"
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function HeroCatalogList({
  emptyText,
  heroes,
  isSelectionDisabled,
  onSelectHero,
  selectedHeroId,
  title,
}: {
  emptyText: string;
  heroes: readonly Hero[];
  isSelectionDisabled: boolean;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
  title: string;
}) {
  const sections = getHeroGuideSelectorSections(heroes, heroFactions);

  return (
    <View style={styles.listSection}>
      <Text style={styles.listTitle}>{title}</Text>
      {heroes.length === 0 ? (
        <Text style={styles.stateText}>{emptyText}</Text>
      ) : (
        <HeroCatalogSections
          isSelectionDisabled={isSelectionDisabled}
          onSelectHero={onSelectHero}
          sections={sections}
          selectedHeroId={selectedHeroId}
        />
      )}
    </View>
  );
}

type HeroCatalogSectionsProps = {
  isSelectionDisabled: boolean;
  onSelectHero: (heroId: string) => void;
  sections: HeroGuideSelectorSections;
  selectedHeroId: string | null;
};

function HeroCatalogSections({
  isSelectionDisabled,
  onSelectHero,
  sections,
  selectedHeroId,
}: HeroCatalogSectionsProps) {
  return (
    <View style={styles.catalogSections}>
      {sections.urHeroes.length > 0 ? (
        <HeroGrid
          heroes={sections.urHeroes}
          isSelectionDisabled={isSelectionDisabled}
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
              isSelectionDisabled={isSelectionDisabled}
              key={group.faction.id}
              onSelectHero={onSelectHero}
              selectedHeroId={selectedHeroId}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

type HeroGridProps = {
  heroes: readonly Hero[];
  isSelectionDisabled: boolean;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
  title: string;
};

function HeroGrid({
  heroes,
  isSelectionDisabled,
  onSelectHero,
  selectedHeroId,
  title,
}: HeroGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {heroes.map((hero) => (
          <HeroOption
            disabled={isSelectionDisabled}
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
  isSelectionDisabled: boolean;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

function FactionHeroGrid({
  group,
  isSelectionDisabled,
  onSelectHero,
  selectedHeroId,
}: FactionHeroGridProps) {
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
            disabled={isSelectionDisabled}
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
  disabled: boolean;
  hero: Hero;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

function HeroOption({
  disabled,
  hero,
  onSelectHero,
  selectedHeroId,
}: HeroOptionProps) {
  const isSelected = hero.id === selectedHeroId;

  return (
    <Pressable
      accessibilityLabel={
        isSelected ? `Герой ${hero.name.ru} выбран` : `Выбрать героя ${hero.name.ru}`
      }
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSelected }}
      disabled={disabled}
      onPress={() => {
        if (!isSelected) {
          onSelectHero(hero.id);
        }
      }}
      style={[styles.option, isSelected ? styles.optionSelected : null]}
    >
      <View style={styles.portrait} testID={`hero-portrait-${hero.id}`}>
        {hero.icon ? (
          <AppImage
            accessibilityLabel={`${hero.name.ru} portrait`}
            borderRadius={6}
            height={56}
            source={hero.icon}
            testID={`hero-portrait-image-${hero.id}`}
            width={56}
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
  catalogSections: {
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
  listSection: {
    gap: 10,
  },
  listTitle: {
    color: "#f3d9b3",
    fontSize: 15,
    fontWeight: "800",
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
