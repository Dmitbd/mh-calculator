import { Image } from "react-native";

import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

type GemIconProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  size?: number;
};

const iconPathByLevel: Record<GemIconProps["level"], string> = {
  1: "/img/divinity/gems/gem-700361.png",
  2: "/img/divinity/gems/gem-700362.png",
  3: "/img/divinity/gems/gem-700363.png",
  4: "/img/divinity/gems/gem-700364.png",
  5: "/img/divinity/gems/gem-700365.png",
  6: "/img/divinity/gems/gem-700366.png",
  7: "/img/divinity/gems/gem-700367.png",
};

export function GemIcon({ level, size = 18 }: GemIconProps) {
  return (
    <Image
      accessibilityLabel={`Самоцвет божественности ${level} ур.`}
      resizeMode="contain"
      source={{ uri: resolveAssetUri(iconPathByLevel[level]) }}
      style={{ width: size, height: size }}
    />
  );
}
