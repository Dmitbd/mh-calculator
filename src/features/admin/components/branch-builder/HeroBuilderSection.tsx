import { StyleSheet, View } from "react-native";

import type { Hero } from "@/features/game-data/heroes/types";

import { HeroGuideSelector } from "../HeroGuideSelector";
import { ValidationErrorMessages } from "../ValidationErrorMessages";

type HeroBuilderSectionProps = {
  errors: readonly string[];
  heroListError: string | null;
  heroes?: readonly Hero[];
  isDraftLoadPending?: boolean;
  isHeroListLoading: boolean;
  notCreatedHeroes?: readonly Hero[];
  notPublishedHeroes?: readonly Hero[];
  onRetryHeroList: () => void;
  onSelectHero: (heroId: string) => void;
  selectedHero?: Hero | null;
  selectedHeroId: string | null;
};

export function HeroBuilderSection({
  errors,
  heroListError,
  heroes,
  isDraftLoadPending = false,
  isHeroListLoading,
  notCreatedHeroes,
  notPublishedHeroes = [],
  onRetryHeroList,
  onSelectHero,
  selectedHero,
  selectedHeroId,
}: HeroBuilderSectionProps) {
  const resolvedNotCreatedHeroes = notCreatedHeroes ?? heroes ?? [];
  const resolvedSelectedHero =
    selectedHero !== undefined
      ? selectedHero
      : selectedHeroId
      ? [...resolvedNotCreatedHeroes, ...notPublishedHeroes].find(
          (hero) => hero.id === selectedHeroId,
        ) ?? null
      : null;

  return (
    <View style={styles.wrapper}>
      <HeroGuideSelector
        error={heroListError}
        isDraftLoadPending={isDraftLoadPending}
        isLoading={isHeroListLoading}
        notCreatedHeroes={resolvedNotCreatedHeroes}
        notPublishedHeroes={notPublishedHeroes}
        onRetry={onRetryHeroList}
        onSelectHero={onSelectHero}
        selectedHero={resolvedSelectedHero}
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
