import { towerOfBabelConfig } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryManualScreen } from "./WeeklyRivalryManualScreen";

export default function TowerOfBabelManualScreen() {
  return (
    <WeeklyRivalryManualScreen
      config={towerOfBabelConfig}
      fallbackHref="/weekly-rivalry/tower-of-babel"
    />
  );
}
