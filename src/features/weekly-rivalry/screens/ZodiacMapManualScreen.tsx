import { zodiacMapConfig } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryManualScreen } from "./WeeklyRivalryManualScreen";

export default function ZodiacMapManualScreen() {
  return (
    <WeeklyRivalryManualScreen
      config={zodiacMapConfig}
      fallbackHref="/weekly-rivalry/zodiac-map"
    />
  );
}
