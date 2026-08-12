import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  loadPublishedHeroBuildSet,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import {
  getCurrentAdminSession,
  type AdminSession,
} from "@/shared/lib/adminAuth";
import { getSupabaseClient } from "@/shared/lib/supabaseClient";
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
  initialAdminSession?: AdminSession | null;
};

/** Read-only экран билда героя: вёрстка branch-builder без редактирования */
export function HeroBuildScreen({
  heroId,
  initialAdminSession,
}: HeroBuildScreenProps) {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  const hero = getHeroById(heroId);
  const fallbackBuildSet = getHeroBuildSet(heroId);
  const [buildSet, setBuildSet] = useState(fallbackBuildSet);
  const [isBuildLoading, setIsBuildLoading] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(
    initialAdminSession ?? null,
  );
  const [isAuthChecked, setIsAuthChecked] = useState(
    initialAdminSession !== undefined,
  );

  useEffect(() => {
    const client = getSupabaseClient();
    let isMounted = true;

    setBuildSet(fallbackBuildSet);

    if (!client) {
      setIsBuildLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsBuildLoading(true);
    void loadPublishedHeroBuildSet({
      client: client as unknown as HeroBuildSetSupabaseClient,
      fallbackBuildSet,
      heroId,
    }).then((loadedBuildSet) => {
      if (isMounted) {
        setBuildSet(loadedBuildSet);
        setIsBuildLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [fallbackBuildSet, heroId]);

  useEffect(() => {
    if (initialAdminSession !== undefined) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setIsAuthChecked(true);
      return;
    }

    let isMounted = true;

    void getCurrentAdminSession(client)
      .then((session) => {
        if (isMounted) {
          setAdminSession(session);
          setIsAuthChecked(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAdminSession(null);
          setIsAuthChecked(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialAdminSession]);

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

  const handleEditBuild = () => {
    router.push({
      pathname: "/admin/branch-builder",
      params: { heroId, mode: "edit" },
    });
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

        {isAuthChecked && adminSession ? (
          <View style={[styles.section, styles.adminActions]}>
            <Pressable
              accessibilityRole="button"
              onPress={handleEditBuild}
              style={[styles.adminButton, styles.secondaryAdminButton]}
            >
              <Text
                style={[
                  styles.adminButtonText,
                  styles.secondaryAdminButtonText,
                ]}
              >
                Редактировать
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isBuildLoading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Загружаем билд...</Text>
          </View>
        ) : null}

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
                awakenedEnabled={hasVisibleAwakenedSkills(
                  view.divinitySkills.awakened,
                )}
                awakenedSkillIds={
                  hasVisibleAwakenedSkills(view.divinitySkills.awakened)
                    ? view.divinitySkills.awakened
                    : []
                }
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

function hasVisibleAwakenedSkills(
  skillIds: readonly (string | null)[] | undefined,
): skillIds is readonly string[] {
  return Boolean(skillIds?.some((skillId) => Boolean(skillId)));
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
  adminActions: {
    flexDirection: "row",
    gap: 10,
  },
  adminButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  adminButtonText: {
    color: "#fff8e8",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryAdminButton: {
    borderWidth: 1,
    borderColor: "#8a6a44",
    backgroundColor: "#2c2118",
  },
  secondaryAdminButtonText: {
    color: "#f6d59a",
  },
  loadingCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5a412b",
    backgroundColor: "#1d130f",
    padding: 12,
  },
  loadingText: {
    color: "#f6d59a",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
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
