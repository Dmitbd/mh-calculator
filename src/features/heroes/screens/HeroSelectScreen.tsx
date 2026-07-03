import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchPublishedHeroIds,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import { heroes, heroesWithBuilds } from "@/features/game-data/heroes";
import { HeroListCard } from "@/features/heroes/components/HeroListCard";
import { HeroListFiltersPanel } from "@/features/heroes/components/HeroListFiltersPanel";
import {
  EMPTY_HERO_LIST_FILTERS,
  filterHeroes,
} from "@/features/heroes/utils/heroListFilters";
import { groupHeroesByZone } from "@/features/heroes/utils/heroListGrouping";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";
import { getSupabaseClient } from "@/shared/lib/supabaseClient";

const SCREEN_PADDING = 24;

/** Экран выбора героя — фильтруемый список героев с готовыми билдами */
export function HeroSelectScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const [filters, setFilters] = useState(EMPTY_HERO_LIST_FILTERS);
  const [remoteHeroIds, setRemoteHeroIds] = useState<string[]>([]);
  const [isRemoteBuildsLoading, setIsRemoteBuildsLoading] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      setIsRemoteBuildsLoading(false);
      return;
    }

    let isMounted = true;

    setIsRemoteBuildsLoading(true);
    void fetchPublishedHeroIds(
      client as unknown as HeroBuildSetSupabaseClient,
    )
      .then((heroIds) => {
        if (isMounted) {
          setRemoteHeroIds(heroIds);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsRemoteBuildsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const zoneGroups = useMemo(() => {
    const buildReadyHeroIds = new Set([
      ...heroesWithBuilds.map((hero) => hero.id),
      ...remoteHeroIds,
    ]);
    const buildReadyHeroes = heroes.filter((hero) => buildReadyHeroIds.has(hero.id));
    const filtered = filterHeroes(buildReadyHeroes, filters);
    return groupHeroesByZone(filtered);
  }, [filters, remoteHeroIds]);

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
        <HeroListFiltersPanel filters={filters} onChange={setFilters} />

        {isRemoteBuildsLoading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Загружаем билды...</Text>
          </View>
        ) : null}

        {zoneGroups.length > 0 ? (
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
});
