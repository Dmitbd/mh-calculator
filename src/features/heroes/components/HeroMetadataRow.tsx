import { StyleSheet, Text, View } from "react-native";

import { AppImage } from "@/shared/ui/AppImage";
import { IconPreview } from "@/shared/ui/IconPreview";
import {
  getDictionaryEntry,
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
} from "@/features/game-data/heroes/heroDictionaries";
import type { Hero, HeroRarity } from "@/features/game-data/heroes/types";

/** Высота бейджа редкости */
const RARITY_BADGE_HEIGHT = 20;

/** Соотношение сторон PNG редкостей */
const RARITY_ASPECT_RATIO: Record<HeroRarity, number> = {
  ssr: 101 / 43,
  ur: 238 / 143,
};

type HeroMetadataRowProps = {
  /** Герой для отображения метаданных */
  hero: Hero;
};

/** Компактная строка метаданных героя: иконка, редкость, роль, фракции, стихия */
export function HeroMetadataRow({ hero }: HeroMetadataRowProps) {
  const rarity = getDictionaryEntry(heroRarities, hero.rarity);
  const role = getDictionaryEntry(heroRoles, hero.role);
  const element = getDictionaryEntry(heroElements, hero.element);
  const factionEntries = hero.factions
    .map((factionId) => getDictionaryEntry(heroFactions, factionId))
    .filter((entry) => entry !== null);

  return (
    <View style={styles.row}>
      <View style={styles.heroIconItem}>
        <IconPreview label={hero.name.ru} size={36} source={hero.icon} />
      </View>
      {rarity ? (
        <View style={styles.rarityItem}>
          <AppImage
            accessibilityLabel={`${rarity.name.ru} icon`}
            height={RARITY_BADGE_HEIGHT}
            resizeMode="contain"
            source={rarity.icon}
            width={RARITY_BADGE_HEIGHT * RARITY_ASPECT_RATIO[hero.rarity]}
          />
        </View>
      ) : null}
      {role ? (
        <View style={styles.item}>
          <IconPreview label={role.name.ru} size={22} source={role.icon} />
          <Text style={styles.label}>{role.name.ru}</Text>
        </View>
      ) : null}
      {factionEntries.map((faction) => (
        <View key={faction.id} style={styles.item}>
          <IconPreview label={faction.name.ru} size={22} source={faction.icon} />
          <Text style={styles.label}>{faction.name.ru}</Text>
        </View>
      ))}
      {element ? (
        <View style={styles.item}>
          <IconPreview label={element.name.ru} size={22} source={element.icon} />
          <Text style={styles.label}>{element.name.ru}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  heroIconItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rarityItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#d7c19a",
    fontSize: 13,
    fontWeight: "600",
  },
});
