import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchPublishedHeroIds,
} from "@/features/builds";
import {
  loadAndCacheRemoteHeroBuildSnapshot,
  loadHeroBuildSnapshotFallback,
} from "@/features/builds/data/heroBuildSnapshotSource";
import { heroes, heroesWithBuilds } from "@/features/game-data/heroes";
import { HeroListCard } from "@/features/heroes/components/HeroListCard";
import { HeroListFiltersPanel } from "@/features/heroes/components/HeroListFiltersPanel";
import {
  EMPTY_HERO_LIST_FILTERS,
  filterHeroes,
} from "@/features/heroes/utils/heroListFilters";
import { groupHeroesByZone } from "@/features/heroes/utils/heroListGrouping";
import { getHeroCatalogCriticalImageSources } from "@/features/heroes/utils/heroCriticalImages";

import { useCriticalImagePreload } from "@/shared/lib/imagePreload";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { ScreenLoader } from "@/shared/ui/ScreenLoader";
import {
  createBoundedRequest,
  isBoundedRequestCancelledError,
  isBoundedRequestTimeoutError,
} from "@/shared/lib/boundedRequest";
import { loadDataBootstrap } from "@/shared/lib/dataBootstrap";
import {
  acceptBootstrap,
  acceptResource,
  beginBootstrap,
  beginResource,
  createSourceSelectionState,
  rejectBootstrap,
  rejectResource,
  type SourceSelectionState,
} from "@/shared/lib/sourceSelection";
import { getSupabaseClient } from "@/shared/lib/supabaseClient";

const SCREEN_PADDING = 24;
export const HERO_CATALOG_REQUEST_TIMEOUT_MS = 8_000;

type HeroCatalogState = {
  error: string | null;
  selection: SourceSelectionState<{ heroBuilds: string[] }>;
};

function createHeroCatalogState(hasRemoteClient: boolean): HeroCatalogState {
  let selection = createSourceSelectionState({
    heroBuilds: heroesWithBuilds.map((hero) => hero.id),
  });
  if (!hasRemoteClient) {
    selection = rejectBootstrap(selection, "not-configured");
    selection = rejectResource(selection, "heroBuilds", "not-configured");
  }
  return { error: null, selection };
}

/** Экран выбора героя — фильтруемый список героев с готовыми билдами */
export function HeroSelectScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const [filters, setFilters] = useState(EMPTY_HERO_LIST_FILTERS);
  const [client] = useState(() => getSupabaseClient());
  const isMounted = useRef(true);
  const requestId = useRef(0);
  const boundedRequest = useRef<{ cancel: () => void } | null>(null);
  const [catalogState, setCatalogState] = useState<HeroCatalogState>(() =>
    createHeroCatalogState(Boolean(client)),
  );

  const loadRemoteHeroIds = useCallback(
    async (preserveContent: boolean) => {
      if (!client || !isMounted.current) {
        return;
      }

      const currentRequestId = requestId.current + 1;
      requestId.current = currentRequestId;

      boundedRequest.current?.cancel();
      boundedRequest.current = null;

      if (preserveContent) {
        setCatalogState((current) => ({
          ...current,
          error: null,
          selection: beginResource(
            beginBootstrap(current.selection),
            "heroBuilds",
          ),
        }));
      }

      let currentBoundedRequest: {
        cancel: () => void;
        promise: Promise<string[]>;
      } | null = null;

      try {
        const bootstrap = await loadDataBootstrap(
          preserveContent ? { force: true } : {},
        );

        if (!isMounted.current || currentRequestId !== requestId.current) {
          return;
        }

        if (bootstrap.source === "fallback") {
          const fallback = await loadHeroBuildSnapshotFallback();
          const fallbackIds = fallback.snapshot.heroBuilds.map(({ heroId }) => heroId);
          setCatalogState((current) => {
            const wasChecking =
              current.selection.resources.heroBuilds.source === "checking";
            const bootstrapFallback = rejectBootstrap(
              current.selection,
              bootstrap.reason,
            );
            const rejectedResource = rejectResource(
              bootstrapFallback,
              "heroBuilds",
              bootstrap.reason,
            );
            return {
              error: wasChecking
                ? "Показаны локальные билды."
                : "Не удалось обновить список билдов.",
              selection: {
                ...rejectedResource,
                resources: {
                  ...rejectedResource.resources,
                  heroBuilds: {
                    ...rejectedResource.resources.heroBuilds,
                    data: wasChecking
                      ? fallbackIds
                      : rejectedResource.resources.heroBuilds.data,
                  },
                },
              },
            };
          });
          return;
        }

        setCatalogState((current) => ({
          ...current,
          selection: beginResource(
            acceptBootstrap(current.selection, bootstrap.manifest),
            "heroBuilds",
          ),
        }));

        currentBoundedRequest = createBoundedRequest(
          fetchPublishedHeroIds(client),
          HERO_CATALOG_REQUEST_TIMEOUT_MS,
        );
        boundedRequest.current = currentBoundedRequest;
        const heroIds = await currentBoundedRequest.promise;
        const fullRemote = await loadAndCacheRemoteHeroBuildSnapshot(
          bootstrap.manifest,
        );
        const acceptedHeroIds = fullRemote.snapshot.heroBuilds.map(
          ({ heroId }) => heroId,
        );

        if (!isMounted.current || currentRequestId !== requestId.current) {
          return;
        }

        setCatalogState((current) => ({
          error: null,
          selection: acceptResource(
            current.selection,
            "heroBuilds",
            acceptedHeroIds,
          ),
        }));
      } catch (error) {
        if (isBoundedRequestCancelledError(error)) {
          return;
        }

        if (!isMounted.current || currentRequestId !== requestId.current) {
          return;
        }

        const fallback = await loadHeroBuildSnapshotFallback();
        const fallbackIds = fallback.snapshot.heroBuilds.map(({ heroId }) => heroId);
        setCatalogState((current) => {
          const wasChecking =
            current.selection.resources.heroBuilds.source === "checking";
          const reason = isBoundedRequestTimeoutError(error)
            ? "timeout"
            : "network";
          const rejectedResource = rejectResource(
            current.selection,
            "heroBuilds",
            reason,
          );
          return {
            error: wasChecking
              ? "Показаны локальные билды."
              : "Не удалось обновить список билдов.",
            selection: {
              ...rejectedResource,
              resources: {
                ...rejectedResource.resources,
                heroBuilds: {
                  ...rejectedResource.resources.heroBuilds,
                  data: wasChecking
                    ? fallbackIds
                    : rejectedResource.resources.heroBuilds.data,
                },
              },
            },
          };
        });
      } finally {
        currentBoundedRequest?.cancel();

        if (boundedRequest.current === currentBoundedRequest) {
          boundedRequest.current = null;
        }
      }
    },
    [client],
  );

  useEffect(() => {
    isMounted.current = true;
    void loadRemoteHeroIds(false);

    return () => {
      isMounted.current = false;
      requestId.current += 1;

      boundedRequest.current?.cancel();
      boundedRequest.current = null;
    };
  }, [loadRemoteHeroIds]);

  const zoneGroups = useMemo(() => {
    const resource = catalogState.selection.resources.heroBuilds;
    const buildReadyHeroIds = new Set(resource.data ?? []);
    const buildReadyHeroes = heroes.filter((hero) => buildReadyHeroIds.has(hero.id));
    const filtered = filterHeroes(buildReadyHeroes, filters);
    return groupHeroesByZone(filtered);
  }, [catalogState.selection.resources.heroBuilds.data, filters]);
  const criticalImageSources = useMemo(
    () =>
      getHeroCatalogCriticalImageSources(
        zoneGroups.flatMap((group) => group.heroes),
      ),
    [zoneGroups],
  );

  const heroBuildsSource = catalogState.selection.resources.heroBuilds;
  const criticalImagesReady = useCriticalImagePreload(criticalImageSources, {
    enabled: heroBuildsSource.source !== "checking",
    readinessKey: heroBuildsSource.source,
    resetOnReadinessKeyChange: false,
  });
  const isInitialContentLoading =
    heroBuildsSource.source === "checking" || !criticalImagesReady;

  const openHero = (heroId: string) => {
    router.push({ pathname: "/heroes/[heroId]", params: { heroId } });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Билды героев" fallbackHref="/" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + top + 10,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
        {isInitialContentLoading ? null : (
          <HeroListFiltersPanel filters={filters} onChange={setFilters} />
        )}

        {isInitialContentLoading ? (
          <ScreenLoader
            label={
              heroBuildsSource.source === "checking"
                ? "Загружаем билды"
                : "Подготавливаем иконки"
            }
          />
        ) : null}

        {!isInitialContentLoading &&
        (catalogState.error || heroBuildsSource.isRefreshing) ? (
          <View style={styles.sourceStatus}>
            {catalogState.error ? (
              <Text accessibilityLiveRegion="polite" style={styles.sourceStatusText}>
                {catalogState.error}
              </Text>
            ) : null}
            {heroBuildsSource.isRefreshing ? (
              <ScreenLoader label="Обновляем список билдов" mode="inline" />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void loadRemoteHeroIds(true);
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Повторить</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {isInitialContentLoading ? null : zoneGroups.length > 0 ? (
          zoneGroups.map((group) => (
            <View key={group.zoneId} style={styles.zone}>
              <Text style={styles.zoneTitle}>{group.title}</Text>
              <View style={styles.zoneList}>
                {group.heroes.map((hero) => (
                  <HeroListCard hero={hero} key={hero.id} onPress={openHero} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Нет героев с готовыми билдами по выбранным фильтрам.
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
    gap: 20,
    paddingHorizontal: SCREEN_PADDING,
  },
  zone: {
    gap: 10,
  },
  zoneTitle: {
    color: "#caa877",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  zoneList: {
    gap: 12,
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a2a1d",
    backgroundColor: "#1d130f",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyText: {
    color: "#d7c19a",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  sourceStatus: {
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#5a412b",
    backgroundColor: "#1d130f",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sourceStatusText: {
    color: "#d7c19a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  retryButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8a6a44",
    backgroundColor: "#2c2118",
    paddingHorizontal: 18,
  },
  retryText: {
    color: "#f6d59a",
    fontSize: 14,
    fontWeight: "900",
  },
});
