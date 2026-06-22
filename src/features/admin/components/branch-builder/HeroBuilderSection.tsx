import { StyleSheet, View } from "react-native";

import type { Hero } from "@/features/game-data/heroes/types";

import { HeroSelectInput } from "../HeroSelectInput";
import { ValidationErrorMessages } from "../ValidationErrorMessages";

type HeroBuilderSectionProps = {
  errors: readonly string[];
  heroQuery: string;
  heroes: readonly Hero[];
  onClearHero: () => void;
  onQueryChange: (value: string) => void;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

export function HeroBuilderSection({
  errors,
  heroQuery,
  heroes,
  onClearHero,
  onQueryChange,
  onSelectHero,
  selectedHeroId,
}: HeroBuilderSectionProps) {
  return (
    <View style={styles.wrapper}>
      <HeroSelectInput
        heroQuery={heroQuery}
        heroes={heroes}
        onClearHero={onClearHero}
        onQueryChange={onQueryChange}
        onSelectHero={onSelectHero}
        selectedHeroId={selectedHeroId}
      />
      <ValidationErrorMessages messages={errors} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
});
