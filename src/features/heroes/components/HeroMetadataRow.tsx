import { ScrollView, StyleSheet, Text, View } from "react-native";

import { IconPreview } from "@/features/admin/components/IconPreview";
import {
  getDictionaryEntry,
  heroElements,
  heroFactions,
  heroRarities,
  heroRoles,
} from "@/features/game-data/heroes/heroDictionaries";
import type { Hero } from "@/features/heroes/types/heroes.types";

type HeroMetadataRowProps = {
  /** Герой для отображения метаданных */
  hero: Hero;
};

/** Компактная строка метаданных героя: редкость, роль, фракции, стихия */
export function HeroMetadataRow({ hero }: HeroMetadataRowProps) {
  const rarity = getDictionaryEntry(heroRarities, hero.rarity);
  const role = getDictionaryEntry(heroRoles, hero.role);
  const element = getDictionaryEntry(heroElements, hero.element);
  const factionEntries = hero.factions
    .map((factionId) => getDictionaryEntry(heroFactions, factionId))
    .filter((entry) => entry !== null);

  return (
    <View style={styles.row}>
      {rarity ? (
        <View style={styles.item}>
          <IconPreview label={rarity.name.ru} size={22} source={rarity.icon} />
          <Text style={styles.label}>{rarity.name.ru}</Text>
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
    gap: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: "#d7c19a",
    fontSize: 13,
    fontWeight: "600",
  },
});
