import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

type DivinityRingProps = {
  canIncrement: boolean;
  currentLevel: number;
  filledSegments: number;
  segmentCount: number;
  targetLevel: number | null;
  transitionReady: boolean;
  onIncrement: () => void;
};

const ringSize = 260;
const ringStrokeRadius = 106;
const ringStrokeWidth = 20;
const segmentGapLength = 8;

export function DivinityRing({
  canIncrement,
  currentLevel,
  filledSegments,
  segmentCount,
  targetLevel,
  transitionReady,
  onIncrement,
}: DivinityRingProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.ringFrame}>
        <View style={styles.crossHorizontal} />
        <View style={styles.crossVertical} />
        <View style={[styles.cornerMark, styles.cornerTop]} />
        <View style={[styles.cornerMark, styles.cornerRight]} />
        <View style={[styles.cornerMark, styles.cornerBottom]} />
        <View style={[styles.cornerMark, styles.cornerLeft]} />

        <View style={styles.outerRing} />
        <View style={styles.innerRing} />

        {segmentCount > 0 ? (
          <Svg
            width={ringSize}
            height={ringSize}
            style={styles.segmentSvg}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            {Array.from({ length: segmentCount }).map((_, index) => {
              const circumference = 2 * Math.PI * ringStrokeRadius;
              const slotLength = circumference / segmentCount;
              const paintedLength = Math.max(slotLength - segmentGapLength, 0);
              // Center each divider on the cardinal axis instead of leaving the gap trailing it.
              const dashOffset = slotLength * index + segmentGapLength / 2;
              const isActive = transitionReady || index < filledSegments;

              return (
                <G key={index}>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringStrokeRadius}
                    fill="none"
                    stroke={isActive ? "rgba(126, 231, 255, 0.18)" : "rgba(63, 108, 122, 0.42)"}
                    strokeWidth={ringStrokeWidth}
                    strokeLinecap="butt"
                    strokeDasharray={`${paintedLength} ${circumference - paintedLength}`}
                    strokeDashoffset={-dashOffset}
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                  {isActive ? (
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringStrokeRadius}
                      fill="none"
                      stroke="#baf6ff"
                      strokeWidth={ringStrokeWidth - 6}
                      strokeLinecap="butt"
                      strokeDasharray={`${paintedLength} ${circumference - paintedLength}`}
                      strokeDashoffset={-dashOffset}
                      transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}

        <Pressable
          accessibilityLabel="Повысить божественность"
          accessibilityRole="button"
          disabled={!canIncrement}
          onPress={onIncrement}
          style={[styles.coreButton, !canIncrement && styles.disabledCoreButton]}
        >
          <View style={styles.innerGlow} />
          <View style={styles.innerCore} />
          <View style={styles.artDiamond} />
          <View style={[styles.artDiamond, styles.artDiamondSecondary]} />
          <Text style={styles.coreLevelText}>Lv.{targetLevel ?? currentLevel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  ringFrame: {
    width: ringSize,
    height: ringSize,
    alignItems: "center",
    justifyContent: "center",
  },
  crossHorizontal: {
    position: "absolute",
    width: ringSize,
    height: 2,
    backgroundColor: "#b69a67",
    opacity: 0.5,
  },
  crossVertical: {
    position: "absolute",
    width: 2,
    height: ringSize,
    backgroundColor: "#b69a67",
    opacity: 0.25,
  },
  cornerMark: {
    position: "absolute",
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#dcc58d",
    backgroundColor: "#140d0b",
    transform: [{ rotate: "45deg" }],
  },
  cornerTop: {
    top: 12,
  },
  cornerRight: {
    right: 12,
  },
  cornerBottom: {
    bottom: 12,
  },
  cornerLeft: {
    left: 12,
  },
  outerRing: {
    position: "absolute",
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 3,
    borderColor: "#dcc58d",
    backgroundColor: "rgba(31, 15, 12, 0.84)",
  },
  innerRing: {
    position: "absolute",
    width: 212,
    height: 212,
    borderRadius: 106,
    borderWidth: 1.5,
    borderColor: "rgba(242, 226, 185, 0.7)",
    backgroundColor: "rgba(25, 12, 18, 0.88)",
  },
  segmentSvg: {
    position: "absolute",
  },
  coreButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#15112d",
    borderWidth: 3,
    borderColor: "#e4d0a1",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  disabledCoreButton: {
    opacity: 0.7,
  },
  innerGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#241845",
  },
  innerCore: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "#171131",
    borderWidth: 1,
    borderColor: "rgba(109, 219, 255, 0.22)",
  },
  artDiamond: {
    position: "absolute",
    width: 88,
    height: 88,
    borderWidth: 3,
    borderColor: "#7f5cff",
    transform: [{ rotate: "45deg" }],
  },
  artDiamondSecondary: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: "#3ccfff",
  },
  coreLevelText: {
    position: "absolute",
    bottom: 20,
    fontSize: 34,
    fontWeight: "900",
    color: "#fff8ef",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
});
