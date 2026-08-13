import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { loadPublishedHeroBuildSet } from "@/features/builds";
import {
  getBuildSetFromSnapshot,
  loadAndCacheRemoteHeroBuildSnapshot,
  loadHeroBuildSnapshotFallback,
} from "@/features/builds/data/heroBuildSnapshotSource";
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
  getTabByPath,
  sortBuildTabs,
} from "@/features/game-data/heroes";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { ScreenLoader } from "@/shared/ui/ScreenLoader";
import {
  createBoundedRequest,
  isBoundedRequestTimeoutError,
} from "@/shared/lib/boundedRequest";
import { loadDataBootstrap } from "@/shared/lib/dataBootstrap";
import { useCriticalImagePreload } from "@/shared/lib/imagePreload";
import {
  acceptBootstrap,
  acceptResource,
  beginResource,
  rejectBootstrap,
  rejectResource,
} from "@/shared/lib/sourceSelection";

import { HeroMetadataRow } from "../components/HeroMetadataRow";
import { HeroBuildBranchSection } from "../components/hero-build/HeroBuildBranchSection";
import { HeroBuildEquipmentSection } from "../components/hero-build/HeroBuildEquipmentSection";
import { HeroBuildTabsSection } from "../components/hero-build/HeroBuildTabsSection";
import { HeroBuildWeaponAwakeningSection } from "../components/hero-build/HeroBuildWeaponAwakeningSection";
import {
  createHeroBuildLoadState,
  resolveHeroBuildLoadState,
} from "../model/heroBuildLoading";
import { getHeroBuildTabViewModel } from "../model/heroBuildTabs";
import { mapBuildToView } from "../utils/mapBuildToView";
import { getHeroMetadataImageSources } from "../utils/heroCriticalImages";

const SCREEN_PADDING = 20;
export const HERO_BUILD_REQUEST_TIMEOUT_MS = 8_000;

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
  const criticalImageSources = useMemo(
    () => (hero ? getHeroMetadataImageSources(hero) : []),
    [hero],
  );
  const criticalImagesReady = useCriticalImagePreload(criticalImageSources, {
    enabled: Boolean(hero),
    readinessKey: heroId,
  });
  const fallbackBuildSet = getHeroBuildSet(heroId);
  const [client] = useState(() => getSupabaseClient());
  const noClientDiagnosticHeroId = useRef<string | null>(null);
  const [loadState, setLoadState] = useState(() =>
    createHeroBuildLoadState({
      fallbackBuildSet,
      hasRemoteClient: Boolean(client),
      heroId,
    }),
  );
  const currentLoadState =
    loadState.heroId === heroId
      ? loadState
      : createHeroBuildLoadState({
          fallbackBuildSet,
          hasRemoteClient: Boolean(client),
          heroId,
        });

  if (currentLoadState !== loadState) {
    setLoadState(currentLoadState);
  }

  const [adminSession, setAdminSession] = useState<AdminSession | null>(
    initialAdminSession ?? null,
  );
  const [isAuthChecked, setIsAuthChecked] = useState(
    initialAdminSession !== undefined,
  );

  useEffect(() => {
    let isMounted = true;
    let activeResourceRequest: { cancel: () => void } | null = null;

    if (!client) {
      if (noClientDiagnosticHeroId.current !== heroId) {
        noClientDiagnosticHeroId.current = heroId;
        console.info("Hero build fallback", {
          heroId,
          kind: "not-configured",
        });
      }

      return () => {
        isMounted = false;
      };
    }

    const loadBuild = async () => {
      let sourceSelection = currentLoadState.sourceSelection;
      try {
        const bootstrap = await loadDataBootstrap();
        if (!isMounted) {
          return;
        }

        if (bootstrap.source === "fallback") {
          console.info("Hero build fallback", {
            heroId,
            kind: bootstrap.reason,
          });
          const fallback = await loadHeroBuildSnapshotFallback();
          sourceSelection = rejectBootstrap(sourceSelection, bootstrap.reason);
          sourceSelection = rejectResource(
            sourceSelection,
            "heroBuilds",
            bootstrap.reason,
          );
          sourceSelection = {
            ...sourceSelection,
            resources: {
              ...sourceSelection.resources,
              heroBuilds: {
                ...sourceSelection.resources.heroBuilds,
                data: getBuildSetFromSnapshot(fallback, heroId),
              },
            },
          };
          const nextSelection = sourceSelection;
          setLoadState((current) =>
            current.heroId === heroId
              ? resolveHeroBuildLoadState(current, nextSelection)
              : current,
          );
          return;
        }

        sourceSelection = acceptBootstrap(sourceSelection, bootstrap.manifest);
        sourceSelection = beginResource(sourceSelection, "heroBuilds");

        const resourceRequest = createBoundedRequest(
          loadPublishedHeroBuildSet({
            client,
            fallbackBuildSet,
            heroId,
            onFallback: (outcome) => {
              console.info("Hero build fallback", { heroId, kind: outcome.kind });
            },
          }),
          HERO_BUILD_REQUEST_TIMEOUT_MS,
        );
        activeResourceRequest = resourceRequest;
        await resourceRequest.promise;
        const fullRemote = await loadAndCacheRemoteHeroBuildSnapshot(
          bootstrap.manifest,
        );
        const acceptedBuildSet = getBuildSetFromSnapshot(fullRemote, heroId);
        sourceSelection = acceptResource(
          sourceSelection,
          "heroBuilds",
          acceptedBuildSet,
        );
        const acceptedSelection = sourceSelection;

        if (isMounted) {
          setLoadState((current) =>
            current.heroId === heroId
              ? resolveHeroBuildLoadState(current, acceptedSelection)
              : current,
          );
        }
      } catch (error) {
        if (isMounted) {
          const reason = isBoundedRequestTimeoutError(error)
            ? "timeout"
            : "network";
          console.info("Hero build fallback", {
            heroId,
            kind: reason,
          });
          const fallback = await loadHeroBuildSnapshotFallback();
          sourceSelection = rejectResource(
            sourceSelection,
            "heroBuilds",
            reason,
          );
          sourceSelection = {
            ...sourceSelection,
            resources: {
              ...sourceSelection.resources,
              heroBuilds: {
                ...sourceSelection.resources.heroBuilds,
                data: getBuildSetFromSnapshot(fallback, heroId),
              },
            },
          };
          const failedSelection = sourceSelection;
          setLoadState((current) =>
            current.heroId === heroId
              ? resolveHeroBuildLoadState(current, failedSelection)
              : current,
          );
        }
      }
    };

    void loadBuild();

    return () => {
      isMounted = false;
      activeResourceRequest?.cancel();
    };
  }, [client, fallbackBuildSet, heroId]);

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

  const { activePath, buildSet, isLoading: isBuildLoading } = currentLoadState;
  const sortedTabs = useMemo(
    () => (buildSet ? filterTabsWithReadyBuilds(buildSet.tabs) : []),
    [buildSet],
  );

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
      setLoadState((current) => ({
        ...current,
        activePath: [tabId, firstChild.id],
      }));
      return;
    }

    setLoadState((current) => ({ ...current, activePath: [tabId] }));
  };

  const handleSelectChildTab = (tabId: string) => {
    if (!activeTopId) {
      return;
    }

    setLoadState((current) => ({
      ...current,
      activePath: [activeTopId, tabId],
    }));
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
        {!criticalImagesReady ? (
          <ScreenLoader label="Подготавливаем иконки" />
        ) : (
          <View style={styles.section}>
            <HeroMetadataRow hero={hero} />
          </View>
        )}

        {criticalImagesReady && isAuthChecked && adminSession ? (
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

        {criticalImagesReady && isBuildLoading ? (
          <ScreenLoader label="Загружаем билд" />
        ) : null}

        {criticalImagesReady && sortedTabs.length > 0 ? (
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

        {criticalImagesReady && view ? (
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
        ) : isBuildLoading || !criticalImagesReady ? null : (
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
