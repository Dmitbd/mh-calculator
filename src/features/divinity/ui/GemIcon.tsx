import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";

type GemIconProps = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  size?: number;
};

const sidesByLevel: Record<GemIconProps["level"], number> = {
  1: 3,
  2: 4,
  3: 5,
  4: 6,
  5: 8,
  6: 9,
  7: 10,
};

const rotationByLevel: Record<GemIconProps["level"], number> = {
  1: Math.PI / 2,
  2: -Math.PI / 2,
  3: -Math.PI / 2,
  4: -Math.PI / 2,
  5: -Math.PI / 2,
  6: -Math.PI / 2,
  7: -Math.PI / 2,
};

const paletteByLevel: Record<
  GemIconProps["level"],
  { edge: string; top: string; bottom: string; inner: string }
> = {
  1: { edge: "#f7edb7", top: "#ffe680", bottom: "#dba633", inner: "#fff7c8" },
  2: { edge: "#f7dcff", top: "#f1b1ff", bottom: "#c16bdd", inner: "#fde7ff" },
  3: { edge: "#fff0b8", top: "#ffd86d", bottom: "#d49a28", inner: "#fff4ca" },
  4: { edge: "#ffe0b8", top: "#ffb566", bottom: "#db7930", inner: "#fff0da" },
  5: { edge: "#ffd4dc", top: "#ff8b96", bottom: "#c84958", inner: "#ffe4e8" },
  6: { edge: "#d6f4ff", top: "#8ee6ff", bottom: "#2ca5db", inner: "#e9fbff" },
  7: { edge: "#efe0ff", top: "#c59bff", bottom: "#6f4bcc", inner: "#f5edff" },
};

function polygonPoints(sides: number, size: number, rotation: number, scale = 1) {
  const center = size / 2;
  const radius = (size / 2 - 1.5) * scale;

  return Array.from({ length: sides })
    .map((_, index) => {
      const angle = (Math.PI * 2 * index) / sides + rotation;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      return `${x},${y}`;
    })
    .join(" ");
}

export function GemIcon({ level, size = 18 }: GemIconProps) {
  const sides = sidesByLevel[level];
  const rotation = rotationByLevel[level];
  const palette = paletteByLevel[level];
  const outerPoints = polygonPoints(sides, size, rotation, 1);
  const innerPoints = polygonPoints(sides, size, rotation, 0.58);
  const gradientId = `gem-gradient-${level}-${size}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={palette.top} />
          <Stop offset="100%" stopColor={palette.bottom} />
        </LinearGradient>
      </Defs>
      <Polygon
        points={outerPoints}
        fill={`url(#${gradientId})`}
        stroke={palette.edge}
        strokeWidth={1.2}
      />
      <Polygon
        points={innerPoints}
        fill={palette.inner}
        fillOpacity={0.42}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={0.7}
      />
    </Svg>
  );
}
