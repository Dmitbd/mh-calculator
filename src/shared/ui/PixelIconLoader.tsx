import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import type { ImageLoadingPhase } from "./useImageLoadingTransition";

type PixelIconLoaderPhase = Exclude<
  ImageLoadingPhase,
  "missing" | "pending" | "loaded"
>;

type PixelIconLoaderProps = {
  borderRadius: number;
  height: number;
  phase: PixelIconLoaderPhase;
  prefersReducedMotion: boolean;
  testID?: string;
  width: number;
};

const FALLING_CUBE_COUNT = 4;
const ROW_CUBE_COUNT = 4;

export function PixelIconLoader({
  borderRadius,
  height,
  phase,
  prefersReducedMotion,
  testID,
  width,
}: PixelIconLoaderProps) {
  const fallingProgress = useRef(
    Array.from({ length: FALLING_CUBE_COUNT }, () => new Animated.Value(0)),
  ).current;
  const finishProgress = useRef(new Animated.Value(0)).current;
  const cubeSize = Math.max(
    2,
    Math.min(8, Math.floor(Math.min(width, height) / 6)),
  );
  const horizontalPadding = Math.max(2, Math.floor(cubeSize / 2));
  const rowWidth = width - horizontalPadding * 2;
  const rowGap = Math.max(1, Math.floor(cubeSize / 4));
  const rowCubeWidth = Math.max(
    2,
    Math.floor((rowWidth - rowGap * (ROW_CUBE_COUNT - 1)) / ROW_CUBE_COUNT),
  );
  const fallDistance = Math.max(0, height - cubeSize * 2 - horizontalPadding);
  const fallingLeft = useMemo(
    () =>
      Array.from({ length: FALLING_CUBE_COUNT }, (_, index) => {
        const available = Math.max(0, width - horizontalPadding * 2 - cubeSize);
        return horizontalPadding + (available * index) / (FALLING_CUBE_COUNT - 1);
      }),
    [cubeSize, horizontalPadding, width],
  );

  useEffect(() => {
    fallingProgress.forEach((progress) => progress.setValue(0));
    finishProgress.setValue(0);

    if (prefersReducedMotion || phase !== "animating") {
      return;
    }

    const fallingLoop = Animated.loop(
      Animated.stagger(
        130,
        fallingProgress.map((progress) =>
          Animated.timing(progress, {
            duration: 620,
            easing: Easing.linear,
            toValue: 1,
            useNativeDriver: true,
          }),
        ),
      ),
    );
    fallingLoop.start();

    return () => {
      fallingLoop.stop();
      fallingProgress.forEach((progress) => progress.stopAnimation());
    };
  }, [fallingProgress, finishProgress, phase, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !phase.startsWith("finishing-")) {
      return;
    }

    const finishAnimation = Animated.timing(finishProgress, {
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    finishAnimation.start();

    return () => {
      finishAnimation.stop();
      finishProgress.stopAnimation();
    };
  }, [finishProgress, phase, prefersReducedMotion]);

  const isFallingVisible = phase === "animating" && !prefersReducedMotion;
  const isFinishing = phase.startsWith("finishing-");
  const rowOpacity = isFinishing
    ? finishProgress.interpolate({
        inputRange: [0, 0.55, 1],
        outputRange: [0.72, 1, 0],
      })
    : phase === "error"
      ? 0.38
      : 0.72;
  const rowScale = isFinishing
    ? finishProgress.interpolate({
        inputRange: [0, 0.55, 1],
        outputRange: [1, 1.08, 0],
      })
    : 1;

  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[
        styles.container,
        { borderRadius, height, width },
        phase === "error" && styles.errorContainer,
      ]}
      testID={testID ? `${testID}-pixel-loader` : undefined}
    >
      <View
        accessible={false}
        testID={testID ? `${testID}-${phase === "error" ? "error-state" : phase}` : undefined}
      />
      {isFallingVisible
        ? fallingProgress.map((progress, index) => (
            <Animated.View
              accessible={false}
              key={index}
              style={[
                styles.cube,
                {
                  height: cubeSize,
                  left: fallingLeft[index],
                  opacity: progress.interpolate({
                    inputRange: [0, 0.12, 0.82, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  top: horizontalPadding,
                  transform: [
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 0.82, 1],
                        outputRange: [0, fallDistance, fallDistance],
                      }),
                    },
                  ],
                  width: cubeSize,
                },
              ]}
              testID={testID ? `${testID}-falling-cube` : undefined}
            />
          ))
        : null}
      <Animated.View
        accessible={false}
        style={[
          styles.row,
          {
            bottom: horizontalPadding,
            gap: rowGap,
            left: horizontalPadding,
            opacity: rowOpacity,
            transform: [{ scaleX: rowScale }],
          },
        ]}
      >
        {Array.from({ length: ROW_CUBE_COUNT }, (_, index) => (
          <View
            accessible={false}
            key={index}
            style={[
              styles.rowCube,
              { height: cubeSize, width: rowCubeWidth },
            ]}
            testID={testID ? `${testID}-row-cube` : undefined}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#271610",
  },
  errorContainer: {
    borderColor: "#8f4f45",
    backgroundColor: "#321914",
  },
  cube: {
    position: "absolute",
    backgroundColor: "#f0c36a",
    shadowColor: "#ffc83d",
    shadowOpacity: 0.62,
    shadowRadius: 3,
  },
  row: {
    position: "absolute",
    flexDirection: "row",
  },
  rowCube: {
    backgroundColor: "#f0c36a",
    borderWidth: 1,
    borderColor: "#fff3a6",
    shadowColor: "#ffc83d",
    shadowOpacity: 0.42,
    shadowRadius: 2,
  },
});
