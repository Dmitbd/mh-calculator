import { useLocalSearchParams } from "expo-router";

import { heroes } from "../../src/features/game-data/heroes/heroBuilds";
import { HeroBuildScreen } from "../../src/features/heroes/screens/HeroBuildScreen";

/** Список heroId для статического web-экспорта динамического роута */
export function generateStaticParams(): { heroId: string }[] {
  return heroes.map((hero) => ({ heroId: hero.id }));
}

export default function HeroBuildRoute() {
  const { heroId } = useLocalSearchParams<{ heroId: string }>();

  return <HeroBuildScreen heroId={heroId} />;
}
