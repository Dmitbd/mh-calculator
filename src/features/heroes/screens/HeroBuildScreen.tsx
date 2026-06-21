import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BranchBuilderGrid } from "@/features/builds/components/BranchBuilderGrid";
import { EquipmentVariantTabs } from "@/features/builds/components/EquipmentVariantTabs";
import { WeaponAwakeningPicker } from "@/features/builds/components/WeaponAwakeningPicker";
import type { BranchColumn } from "@/features/game-data/divinity/types";
import {
  divinityBranches,
  divinitySkills,
  divinityTreeTemplate,
} from "@/features/game-data/divinity/catalog";
import {
  equipmentArtifacts,
  equipmentRunes,
} from "@/features/game-data/equipment/catalog";
import {
  weaponAwakeningColors,
  weaponAwakeningCombos,
  weaponAwakeningSlots,
} from "@/features/game-data/weapon-awakening/catalog";
import { resolveWeaponAwakeningBonuses } from "@/features/game-data/weapon-awakening/resolveWeaponAwakeningBonuses";
import {
  getHeroById,
  getHeroBuildSet,
} from "@/features/game-data/heroes/heroBuilds";
import type { HeroBuildTabPath } from "@/features/game-data/heroes/types";
import { WeaponAwakeningBonusList } from "@/features/builds/components/WeaponAwakeningBonusList";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

import { BuildFolderTabs } from "@/features/builds/components/BuildFolderTabs";
import { HeroMetadataRow } from "../components/HeroMetadataRow";
import {
  filterTabsWithReadyBuilds,
  getBuildAtPath,
  getDefaultTabPath,
  getTabByPath,
  sortBuildTabs,
} from "@/features/game-data/heroes/heroBuildTabs";
import { mapBuildToView } from "../utils/mapBuildToView";

const columns: BranchColumn[] = [
  { id: "left", label: "левая", isMain: false },
  { id: "center", label: "центр", isMain: true },
  { id: "right", label: "правая", isMain: false },
];

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

  const activeTopId = activePath[0] ?? "";
  const activeChildId = activePath[1];
  const activeTopTab = getTabByPath(sortedTabs, [activeTopId]);
  const childTabs =
    activeTopTab?.kind === "group" && activeTopTab.children && activeTopTab.children.length > 0
      ? sortBuildTabs(activeTopTab.children)
      : [];
  const build = getBuildAtPath(sortedTabs, activePath);
  const view = useMemo(() => (build ? mapBuildToView(build) : null), [build]);

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

  const topFolderTabs = sortedTabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    accessibilityLabel: `Select ${tab.label} build tab`,
  }));
  const childFolderTabs = childTabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    accessibilityLabel: `Select ${tab.label} build tab`,
  }));

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
            <BuildFolderTabs
              childTabs={childFolderTabs.length > 0 ? childFolderTabs : undefined}
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
              <EquipmentVariantTabs
                label="Оружие"
                options={equipmentArtifacts}
                selectedIds={view.artifactIds}
              />
            </View>

            <View style={styles.section}>
              <EquipmentVariantTabs
                label="Руны"
                options={equipmentRunes}
                selectedIds={view.runeIds}
              />
            </View>

            <View style={styles.weaponAwakeningSection}>
              <WeaponAwakeningPicker
                colors={weaponAwakeningColors}
                readOnly
                selections={view.weaponAwakeningSelections}
                slots={weaponAwakeningSlots}
              />
              <WeaponAwakeningBonusList
                bonuses={weaponAwakeningBonuses}
                colors={weaponAwakeningColors}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.branchSection}>
                <Text style={styles.sectionLabel}>Ветка</Text>
                <BranchBuilderGrid
                  branches={divinityBranches}
                  columns={columns}
                  progressLevels={view.progressLevels}
                  readOnly
                  selectedBranches={view.selectedBranches}
                  selectedMajorSkills={view.selectedMajorSkills}
                  skillCatalog={divinitySkills}
                  skills={divinitySkills}
                  template={divinityTreeTemplate}
                />
              </View>
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
  weaponAwakeningSection: {
    width: "100%",
    gap: 12,
  },
  branchSection: {
    gap: 8,
  },
  sectionLabel: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
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
