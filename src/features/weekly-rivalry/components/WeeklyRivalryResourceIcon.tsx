import type { WeeklyRivalryReward } from "@/features/game-data/weekly-rivalry";
import { AppImage } from "@/shared/ui/AppImage";

type WeeklyRivalryResourceIconProps = {
  resource: WeeklyRivalryReward;
  size?: number;
};

export function WeeklyRivalryResourceIcon({
  resource,
  size = 38,
}: WeeklyRivalryResourceIconProps) {
  return (
    <AppImage
      accessibilityLabel={resource.name}
      borderRadius={8}
      height={size}
      resizeMode="contain"
      source={resource.icon}
      width={size}
    />
  );
}
