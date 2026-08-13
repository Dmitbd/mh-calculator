import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ScreenLoaderProps = {
  label: string;
  mode?: "full" | "inline";
};

export function ScreenLoader({ label, mode = "full" }: ScreenLoaderProps) {
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const orbitProgress = useRef(new Animated.Value(0)).current;
  const hasReceivedMotionEvent = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted && !hasReceivedMotionEvent.current) {
          setPrefersReducedMotion(isEnabled);
        }
      })
      .catch(() => {
        // A static mark is the safe fallback when the platform cannot report it.
      });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (isEnabled) => {
        hasReceivedMotionEvent.current = true;

        if (isMounted) {
          setPrefersReducedMotion(isEnabled);
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      pulseProgress.stopAnimation();
      pulseProgress.setValue(0);
      orbitProgress.stopAnimation();
      orbitProgress.setValue(0);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.timing(pulseProgress, {
        duration: 1250,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    const orbitAnimation = Animated.loop(
      Animated.timing(orbitProgress, {
        duration: 1800,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    pulseAnimation.start();
    orbitAnimation.start();

    return () => {
      pulseAnimation.stop();
      orbitAnimation.stop();
      pulseProgress.stopAnimation();
      orbitProgress.stopAnimation();
    };
  }, [orbitProgress, prefersReducedMotion, pulseProgress]);

  const animatedBoltStyle = prefersReducedMotion
    ? styles.staticBolt
    : {
        opacity: pulseProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.82, 1, 0.82],
        }),
        transform: [
          {
            scale: pulseProgress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.9, 1.12, 0.9],
            }),
          },
        ],
      };
  const animatedRingStyle = prefersReducedMotion
    ? styles.staticRing
    : {
        opacity: pulseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.45, 0],
        }),
        transform: [
          {
            scale: pulseProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.68, 1.18],
            }),
          },
        ],
      };
  const animatedOrbitStyle = prefersReducedMotion
    ? undefined
    : {
        transform: [
          {
            rotate: orbitProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      };

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessible
      style={[styles.container, mode === "full" ? styles.full : styles.inline]}
      testID="screen-loader"
    >
      <View
        accessible={false}
        style={styles.markFrame}
        testID="screen-loader-mark"
      >
        <Animated.View
          accessible={false}
          style={[styles.pulseRing, animatedRingStyle]}
          testID="screen-loader-pulse-ring"
        />
        <Animated.View
          accessible={false}
          style={[styles.sparkOrbit, animatedOrbitStyle]}
        >
          <View
            accessible={false}
            style={[styles.spark, styles.sparkTop]}
            testID="screen-loader-spark"
          />
          <View
            accessible={false}
            style={[styles.spark, styles.sparkBottom]}
            testID="screen-loader-spark"
          />
        </Animated.View>
        <Animated.Text
          accessible={false}
          style={[styles.bolt, animatedBoltStyle]}
          testID="screen-loader-bolt"
        >
          ⚡
        </Animated.Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  full: {
    flex: 1,
    minHeight: 240,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  inline: {
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  markFrame: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "#f0c36a",
  },
  staticRing: {
    opacity: 0.45,
    transform: [{ scale: 1 }],
  },
  sparkOrbit: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  spark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff3a6",
    shadowColor: "#ffc83d",
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  sparkTop: {
    top: 0,
    left: 40,
  },
  sparkBottom: {
    bottom: 0,
    left: 40,
  },
  bolt: {
    fontSize: 48,
    lineHeight: 56,
  },
  staticBolt: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  label: {
    color: "#f6d59a",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
