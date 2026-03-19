import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

type DivinityRingProps = {
  canDecrement: boolean;
  canIncrement: boolean;
  currentLevel: number;
  filledSegments: number;
  segmentCount: number;
  targetLevel: number | null;
  transitionReady: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
};

const ringSize = 220;
const ringStrokeRadius = 88;
const ringStrokeWidth = 18;
const segmentGapLength = 8;

export function DivinityRing({
  canDecrement,
  canIncrement,
  currentLevel,
  filledSegments,
  segmentCount,
  targetLevel,
  transitionReady,
  onDecrement,
  onIncrement,
}: DivinityRingProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.controlsRow}>
        <Pressable
          accessibilityLabel="Понизить божественность"
          accessibilityRole="button"
          disabled={!canDecrement}
          onPress={onDecrement}
          style={[styles.controlButton, !canDecrement && styles.disabledControlButton]}
        >
          <Text style={styles.controlButtonText}>-</Text>
        </Pressable>
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

        <View style={[styles.coreButton, !canIncrement && styles.disabledCoreButton]}>
          <View style={styles.innerGlow} />
          <View style={styles.innerCore} />
          <View style={styles.artDiamond} />
          <View style={[styles.artDiamond, styles.artDiamondSecondary]} />
          <Text style={styles.coreLevelText}>Lv.{targetLevel ?? currentLevel}</Text>
        </View>
        </View>
        <Pressable
          accessibilityLabel="Повысить божественность"
          accessibilityRole="button"
          disabled={!canIncrement}
          onPress={onIncrement}
          style={[styles.controlButton, !canIncrement && styles.disabledControlButton]}
        >
          <Text style={styles.controlButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  controlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8f6034",
    backgroundColor: "#2a160e",
  },
  disabledControlButton: {
    opacity: 0.45,
  },
  controlButtonText: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "900",
    color: "#f3d38a",
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
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 3,
    borderColor: "#dcc58d",
    backgroundColor: "rgba(31, 15, 12, 0.84)",
  },
  innerRing: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 1.5,
    borderColor: "rgba(242, 226, 185, 0.7)",
    backgroundColor: "rgba(25, 12, 18, 0.88)",
  },
  segmentSvg: {
    position: "absolute",
  },
  coreButton: {
    width: 146,
    height: 146,
    borderRadius: 73,
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
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: "#241845",
  },
  innerCore: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#171131",
    borderWidth: 1,
    borderColor: "rgba(109, 219, 255, 0.22)",
  },
  artDiamond: {
    position: "absolute",
    width: 72,
    height: 72,
    borderWidth: 3,
    borderColor: "#7f5cff",
    transform: [{ rotate: "45deg" }],
  },
  artDiamondSecondary: {
    width: 46,
    height: 46,
    borderWidth: 2,
    borderColor: "#3ccfff",
  },
  coreLevelText: {
    position: "absolute",
    bottom: 16,
    fontSize: 28,
    fontWeight: "900",
    color: "#fff8ef",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
});
