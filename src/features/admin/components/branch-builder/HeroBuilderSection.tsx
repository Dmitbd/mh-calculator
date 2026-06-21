import { View } from "react-native";

import type { Hero } from "@/features/game-data/heroes/types";

import { HeroSelectInput } from "../HeroSelectInput";

type HeroBuilderSectionProps = {
  heroQuery: string;
  heroes: readonly Hero[];
  onClearHero: () => void;
  onQueryChange: (value: string) => void;
  onSelectHero: (heroId: string) => void;
  selectedHeroId: string | null;
};

export function HeroBuilderSection({
  heroQuery,
  heroes,
  onClearHero,
  onQueryChange,
  onSelectHero,
  selectedHeroId,
}: HeroBuilderSectionProps) {
  return (
    <View>
      <HeroSelectInput
        heroQuery={heroQuery}
        heroes={heroes}
        onClearHero={onClearHero}
        onQueryChange={onQueryChange}
        onSelectHero={onSelectHero}
        selectedHeroId={selectedHeroId}
      />
    </View>
  );
}
