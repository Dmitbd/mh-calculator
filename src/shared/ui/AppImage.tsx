import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  type ImageResizeMode,
  StyleSheet,
  View,
} from "react-native";

import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { PixelIconLoader } from "./PixelIconLoader";
import {
  ICON_LOADER_FINISH_MS,
  useImageLoadingTransition,
} from "./useImageLoadingTransition";

type AppImageProps = {
  accessibilityLabel: string;
  borderRadius?: number;
  height: number;
  resizeMode?: ImageResizeMode;
  source: string | null | undefined;
  testID?: string;
  width: number;
};

/**
 * Stable boundary for URL images. The final box exists before fetch/decode and
 * remains unchanged when loading fails.
 */
export function AppImage({
  accessibilityLabel,
  borderRadius = 0,
  height,
  resizeMode = "cover",
  source,
  testID,
  width,
}: AppImageProps) {
  const uri = source ? resolveAssetUri(source) : null;
  const { handleError, handleLoad, phase, prefersReducedMotion } =
    useImageLoadingTransition(uri);
  const revealProgress = useRef(new Animated.Value(0)).current;
  const revealAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    revealAnimation.current?.stop();
    revealAnimation.current = null;

    if (phase === "finishing-loaded" && !prefersReducedMotion) {
      revealProgress.setValue(0);
      revealAnimation.current = Animated.timing(revealProgress, {
        duration: ICON_LOADER_FINISH_MS,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      });
      revealAnimation.current.start();
    } else if (phase === "loaded") {
      revealProgress.setValue(1);
    } else {
      revealProgress.setValue(0);
    }

    return () => {
      revealAnimation.current?.stop();
      revealAnimation.current = null;
    };
  }, [phase, prefersReducedMotion, revealProgress]);

  const geometry = { borderRadius, height, width };
  const isRevealing = phase === "finishing-loaded" && !prefersReducedMotion;
  const isVisible = phase === "loaded" || isRevealing;
  const showsPlainFallback = phase === "missing" || phase === "pending";
  const showsPixelLoader =
    phase === "animating" ||
    phase === "finishing-loaded" ||
    phase === "finishing-error" ||
    phase === "error";

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.container, geometry]}
      testID={testID}
    >
      {showsPlainFallback ? (
        <View
          pointerEvents="none"
          style={[
            styles.fallback,
            !source && styles.missingFallback,
            geometry,
          ]}
          testID={
            testID
              ? `${testID}-placeholder`
              : undefined
          }
        />
      ) : null}

      {showsPixelLoader ? (
        <View
          pointerEvents="none"
          style={[styles.pixelLayer, geometry]}
          testID={phase === "error" && testID ? `${testID}-error` : undefined}
        >
          <PixelIconLoader
            borderRadius={borderRadius}
            height={height}
            phase={phase}
            prefersReducedMotion={prefersReducedMotion}
            testID={testID}
            width={width}
          />
        </View>
      ) : null}

      {uri ? (
        <Animated.Image
          accessible={false}
          onError={() => handleError(uri)}
          onLoad={() => handleLoad(uri)}
          resizeMode={resizeMode}
          source={{ cache: "force-cache", uri }}
          style={[
            styles.image,
            geometry,
            isVisible
              ? {
                  opacity: revealProgress,
                  transform: prefersReducedMotion
                    ? undefined
                    : [
                        {
                          scale: revealProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.94, 1],
                          }),
                        },
                      ],
                }
              : styles.hidden,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    inset: 0,
  },
  hidden: {
    opacity: 0,
  },
  fallback: {
    position: "absolute",
    inset: 0,
    borderWidth: 1,
    borderColor: "#533b29",
    backgroundColor: "#271610",
  },
  missingFallback: {
    borderStyle: "dashed",
    borderColor: "#6b5645",
    backgroundColor: "transparent",
  },
  pixelLayer: {
    position: "absolute",
    inset: 0,
  },
});
