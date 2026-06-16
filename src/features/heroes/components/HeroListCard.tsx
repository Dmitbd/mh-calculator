import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { IconPreview } from "@/features/admin/components/IconPreview";
import {
  getDictionaryEntry,
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
} from "@/features/game-data/heroes/heroDictionaries";
import type { Hero, HeroRarity } from "@/features/heroes/types/heroes.types";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

/** Высота бейджа редкости в карточке */
const RARITY_BADGE_HEIGHT = 20;

/** Соотношение сторон исходных PNG редкостей */
const RARITY_ASPECT_RATIO: Record<HeroRarity, number> = {
  ssr: 101 / 43,
  ur: 238 / 143,
};

type HeroListCardProps = {
  /** Герой для отображения */
  hero: Hero;
  /** Обработчик нажатия */
  onPress: (heroId: string) => void;
};

/** Карточка героя в списке билдов */
export function HeroListCard({ hero, onPress }: HeroListCardProps) {
  const rarity = getDictionaryEntry(heroRarities, hero.rarity);
  const role = getDictionaryEntry(heroRoles, hero.role);
  const element = getDictionaryEntry(heroElements, hero.element);
  const factionEntries = hero.factions
    .map((factionId) => getDictionaryEntry(heroFactions, factionId))
    .filter((entry) => entry !== null);

  const handlePress = () => {
    onPress(hero.id);
  };

  return (
    <Pressable
      accessibilityLabel={`Открыть билд ${hero.name.ru}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.card}
    >
      <IconPreview label={hero.name.ru} source={hero.icon} size={44} />

      <View style={styles.rarityBlock}>
        {rarity ? (
          <Image
            accessibilityLabel={`${rarity.name.ru} icon`}
            resizeMode="contain"
            source={{ uri: resolveAssetUri(rarity.icon) }}
            style={{
              height: RARITY_BADGE_HEIGHT,
              width: RARITY_BADGE_HEIGHT * RARITY_ASPECT_RATIO[hero.rarity],
            }}
          />
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{hero.name.ru}</Text>
        <View style={styles.metaRow}>
          {role ? (
            <IconPreview label={role.name.ru} size={20} source={role.icon} />
          ) : null}
          {factionEntries.map((faction) => (
            <IconPreview
              key={faction.id}
              label={faction.name.ru}
              size={20}
              source={faction.icon}
            />
          ))}
          {element ? (
            <IconPreview label={element.name.ru} size={20} source={element.icon} />
          ) : null}
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#241610",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rarityBlock: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: "#fff4d7",
    fontSize: 17,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  chevron: {
    color: "#caa877",
    fontSize: 24,
    fontWeight: "900",
  },
});
