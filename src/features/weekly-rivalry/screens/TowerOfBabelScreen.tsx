import { towerOfBabelConfig } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryEventScreen } from "./WeeklyRivalryEventScreen";

export default function TowerOfBabelScreen() {
  return (
    <WeeklyRivalryEventScreen
      config={towerOfBabelConfig}
      manualRoute="/weekly-rivalry/tower-of-babel/manual"
    />
  );
}
