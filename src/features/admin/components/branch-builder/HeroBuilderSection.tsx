import { StyleSheet, View } from "react-native";

import type { Hero } from "@/features/game-data/heroes/types";

import { HeroGuideSelector } from "../HeroGuideSelector";
import { ValidationErrorMessages } from "../ValidationErrorMessages";

type HeroBuilderSectionProps = {
  errors: readonly string[];
  heroListError: string | null;
  isDraftLoadPending: boolean;
  isHeroListLoading: boolean;
  notCreatedHeroes: readonly Hero[];
  notPublishedHeroes: readonly Hero[];
  onRetryHeroList: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHero: Hero | null;
  selectedHeroId: string | null;
};

export function HeroBuilderSection({
  errors,
  heroListError,
  isDraftLoadPending,
  isHeroListLoading,
  notCreatedHeroes,
  notPublishedHeroes,
  onRetryHeroList,
  onSelectHero,
  selectedHero,
  selectedHeroId,
}: HeroBuilderSectionProps) {
  return (
    <View style={styles.wrapper}>
      <HeroGuideSelector
        error={heroListError}
        isDraftLoadPending={isDraftLoadPending}
        isLoading={isHeroListLoading}
        notCreatedHeroes={notCreatedHeroes}
        notPublishedHeroes={notPublishedHeroes}
        onRetry={onRetryHeroList}
        onSelectHero={onSelectHero}
        selectedHero={selectedHero}
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
