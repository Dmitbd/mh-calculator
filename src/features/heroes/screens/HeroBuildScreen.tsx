import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  weaponAwakeningCombos,
  resolveWeaponAwakeningBonuses,
} from "@/features/game-data/weapon-awakening";
import { DivinitySkillLoadoutSection } from "@/features/builds";
import {
  divinityBranches,
  divinitySkills,
} from "@/features/game-data/divinity";
import {
  getHeroById,
  getHeroBuildSet,
  filterTabsWithReadyBuilds,
  getBuildAtPath,
  getDefaultTabPath,
  getTabByPath,
  sortBuildTabs,
} from "@/features/game-data/heroes";
import type { HeroBuildTabPath } from "@/features/game-data/heroes/types";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

import { HeroMetadataRow } from "../components/HeroMetadataRow";
import { HeroBuildBranchSection } from "../components/hero-build/HeroBuildBranchSection";
import { HeroBuildEquipmentSection } from "../components/hero-build/HeroBuildEquipmentSection";
import { HeroBuildTabsSection } from "../components/hero-build/HeroBuildTabsSection";
import { HeroBuildWeaponAwakeningSection } from "../components/hero-build/HeroBuildWeaponAwakeningSection";
import { getHeroBuildTabViewModel } from "../model/heroBuildTabs";
import { mapBuildToView } from "../utils/mapBuildToView";

const SCREEN_PADDING = 20;

type HeroBuildScreenProps = {
  /** Id героя из роута */
  heroId: string;
};

/** Read-only экран билда героя: вёрстка branch-builder без редактирования */
export function HeroBuildScreen({ heroId }: HeroBuildScreenProps) {
  const { top, bottom } = useSafeAreaInsets();

  const hero = getHeroById(heroId);
  const buildSet = getHeroBuildSet(heroId);
  const sortedTabs = useMemo(
    () => (buildSet ? filterTabsWithReadyBuilds(buildSet.tabs) : []),
    [buildSet],
  );
  const defaultPath = useMemo(
    () => (sortedTabs.length > 0 ? getDefaultTabPath(sortedTabs) : []),
    [sortedTabs],
  );
  const [activePath, setActivePath] = useState<HeroBuildTabPath>(defaultPath);

  useEffect(() => {
    setActivePath(defaultPath);
  }, [defaultPath]);

  const build = getBuildAtPath(sortedTabs, activePath);
  const view = useMemo(() => (build ? mapBuildToView(build) : null), [build]);
  const {
    activeChildId,
    activeTopId,
    childFolderTabs,
    topFolderTabs,
  } = useMemo(
    () => getHeroBuildTabViewModel(sortedTabs, activePath),
    [activePath, sortedTabs],
  );

  const weaponAwakeningBonuses = useMemo(
    () =>
      view
        ? resolveWeaponAwakeningBonuses({
            hero,
            selections: view.weaponAwakeningSelections,
            combosData: weaponAwakeningCombos,
          })
        : [],
    [hero, view],
  );

  const handleSelectTopTab = (tabId: string) => {
    const tab = getTabByPath(sortedTabs, [tabId]);

    if (!tab) {
      return;
    }

    if (tab.kind === "group" && tab.children && tab.children.length > 0) {
      const firstChild = sortBuildTabs(tab.children)[0];
      setActivePath([tabId, firstChild.id]);
      return;
    }

    setActivePath([tabId]);
  };

  const handleSelectChildTab = (tabId: string) => {
    if (!activeTopId) {
      return;
    }

    setActivePath([activeTopId, tabId]);
  };

  const contentPadding = {
    paddingTop: SCREEN_HEADER_HEIGHT + top + 10,
    paddingBottom: SCREEN_PADDING + bottom,
  };

  if (!hero) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Герой" fallbackHref="/heroes" />
        <View style={[styles.placeholderWrapper, contentPadding]}>
          <Text style={styles.placeholderText}>Герой не найден.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={hero.name.ru} fallbackHref="/heroes" />
      <ScrollView
        contentContainerStyle={[styles.container, contentPadding]}
      >
        <View style={styles.section}>
          <HeroMetadataRow hero={hero} />
        </View>

        {sortedTabs.length > 0 ? (
          <View style={styles.section}>
            <HeroBuildTabsSection
              childTabs={childFolderTabs}
              onSelectChildTab={handleSelectChildTab}
              onSelectTab={handleSelectTopTab}
              selectedChildTabId={activeChildId}
              selectedTabId={activeTopId}
              tabs={topFolderTabs}
            />
          </View>
        ) : null}

        {view ? (
          <>
            <View style={styles.section}>
              <HeroBuildEquipmentSection
                artifactIds={view.artifactIds}
                runeIds={view.runeIds}
              />
            </View>

            <View style={styles.section}>
              <HeroBuildWeaponAwakeningSection
                bonuses={weaponAwakeningBonuses}
                selections={view.weaponAwakeningSelections}
              />
            </View>

            <View style={styles.section}>
              <DivinitySkillLoadoutSection
                awakenedEnabled={Boolean(view.divinitySkills.awakened)}
                awakenedSkillIds={view.divinitySkills.awakened ?? []}
                baseSkillIds={view.divinitySkills.base}
                branches={divinityBranches}
                readOnly
                skills={divinitySkills}
              />
            </View>

            <View style={styles.section}>
              <HeroBuildBranchSection view={view} />
            </View>
          </>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              Билд для этого режима ещё не готов.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#140d0b",
  },
  container: {
    flexGrow: 1,
    gap: 32,
    paddingHorizontal: SCREEN_PADDING,
  },
  section: {
    width: "100%",
  },
  placeholderWrapper: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a2a1d",
    backgroundColor: "#1d130f",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  placeholderText: {
    color: "#d7c19a",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});
