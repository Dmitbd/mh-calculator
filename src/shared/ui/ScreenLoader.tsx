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
  const animationProgress = useRef(new Animated.Value(0)).current;
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
      animationProgress.stopAnimation();
      animationProgress.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animationProgress, {
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(animationProgress, {
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      animationProgress.stopAnimation();
    };
  }, [animationProgress, prefersReducedMotion]);

  const animatedMarkStyle = prefersReducedMotion
    ? undefined
    : {
        opacity: animationProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1],
        }),
        transform: [
          {
            rotate: animationProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ["45deg", "225deg"],
            }),
          },
          {
            scale: animationProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1.08],
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
      <View style={styles.markFrame}>
        <Animated.View
          style={[styles.mark, animatedMarkStyle]}
          testID="screen-loader-mark"
        >
          <View style={styles.markCore} />
        </Animated.View>
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
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#5a412b",
    backgroundColor: "#1d130f",
  },
  mark: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f6d59a",
    backgroundColor: "#795125",
    transform: [{ rotate: "45deg" }],
  },
  markCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff8e8",
  },
  label: {
    color: "#f6d59a",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
