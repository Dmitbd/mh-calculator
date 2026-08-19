import { zodiacMapConfig } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryEventScreen } from "./WeeklyRivalryEventScreen";

export default function ZodiacMapScreen() {
  return (
    <WeeklyRivalryEventScreen
      config={zodiacMapConfig}
      manualRoute="/weekly-rivalry/zodiac-map/manual"
    />
  );
}
