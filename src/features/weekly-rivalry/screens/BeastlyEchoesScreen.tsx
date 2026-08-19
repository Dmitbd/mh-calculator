import { beastlyEchoesConfig } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryEventScreen } from "./WeeklyRivalryEventScreen";

export default function BeastlyEchoesScreen() {
  return (
    <WeeklyRivalryEventScreen
      config={beastlyEchoesConfig}
      manualRoute="/weekly-rivalry/beastly-echoes/manual"
    />
  );
}
