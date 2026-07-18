import { StyleSheet, View } from "react-native";

import type { Hero } from "@/features/game-data/heroes/types";

import { HeroGuideSelector } from "../HeroGuideSelector";
import { ValidationErrorMessages } from "../ValidationErrorMessages";

type HeroBuilderSectionProps = {
  errors: readonly string[];
  heroListError: string | null;
  heroes: readonly Hero[];
  isHeroListLoading: boolean;
  onRetryHeroList: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

export function HeroBuilderSection({
  errors,
  heroListError,
  heroes,
  isHeroListLoading,
  onRetryHeroList,
  onSelectHero,
  selectedHeroId,
}: HeroBuilderSectionProps) {
  return (
    <View style={styles.wrapper}>
      <HeroGuideSelector
        error={heroListError}
        heroes={heroes}
        isLoading={isHeroListLoading}
        onRetry={onRetryHeroList}
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
