import { beastlyEchoesConfig } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryManualScreen } from "./WeeklyRivalryManualScreen";

export default function BeastlyEchoesManualScreen() {
  return (
    <WeeklyRivalryManualScreen
      config={beastlyEchoesConfig}
      fallbackHref="/weekly-rivalry/beastly-echoes"
    />
  );
}
