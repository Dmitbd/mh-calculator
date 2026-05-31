import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconPreview } from "@/features/admin/components/IconPreview";
import { heroes } from "@/features/game-data/heroes/heroBuilds";

import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

const SCREEN_PADDING = 24;

/** Экран выбора героя — список из каталога ведёт на экран билда */
export function HeroSelectScreen() {
  const { top, bottom } = useSafeAreaInsets();

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
        {heroes.map((hero) => (
          <Pressable
            accessibilityLabel={`Открыть билд ${hero.name}`}
            accessibilityRole="button"
            key={hero.id}
            onPress={() => openHero(hero.id)}
            style={styles.heroRow}
          >
            <IconPreview label={hero.name} source={hero.icon} size={44} />
            <Text style={styles.heroName}>{hero.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
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
    gap: 12,
    paddingHorizontal: SCREEN_PADDING,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#241610",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroName: {
    flex: 1,
    color: "#fff4d7",
    fontSize: 17,
    fontWeight: "700",
  },
  chevron: {
    color: "#caa877",
    fontSize: 24,
    fontWeight: "900",
  },
});
