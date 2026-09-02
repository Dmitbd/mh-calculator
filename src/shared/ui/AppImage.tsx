import { useEffect, useRef, useState } from "react";
import {
  Animated,
  type DimensionValue,
  Easing,
  Image,
  type ImageResizeMode,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

import { PixelIconLoader } from "./PixelIconLoader";
import {
  ICON_LOADER_FINISH_MS,
  useImageLoadingTransition,
} from "./useImageLoadingTransition";

export type AppImageLoadingMode = "animated" | "static";

type AppImageProps = {
  accessible?: boolean;
  accessibilityLabel: string;
  borderRadius?: number;
  height: DimensionValue;
  loadingMode?: AppImageLoadingMode;
  resizeMode?: ImageResizeMode;
  source: string | null | undefined;
  testID?: string;
  width: DimensionValue;
};

type AppImageBoundaryProps = Omit<AppImageProps, "loadingMode">;

function getAccessibilityProps(
  accessible: boolean,
  accessibilityLabel: string,
) {
  if (accessible) {
    return {
      accessible: true,
      accessibilityLabel,
      accessibilityRole: "image" as const,
    };
  }

  return {
    accessible: false,
    accessibilityLabel: undefined,
    accessibilityRole: undefined,
    importantForAccessibility:
      Platform.OS === "android" ? ("no-hide-descendants" as const) : undefined,
  } as const;
}

function getDecorativeImageAccessibilityProps() {
  return {
    accessible: false,
    "aria-hidden": Platform.OS === "web" ? true : undefined,
  } as const;
}

/**
 * Stable boundary for URL images. The final box exists before fetch/decode and
 * remains unchanged when loading fails.
 */
export function AppImage({
  loadingMode = "animated",
  ...props
}: AppImageProps) {
  return loadingMode === "static" ? (
    <StaticAppImage {...props} />
  ) : (
    <AnimatedAppImage {...props} />
  );
}

function StaticAppImage({
  accessible = true,
  accessibilityLabel,
  borderRadius = 0,
  height,
  resizeMode = "cover",
  source,
  testID,
  width,
}: AppImageBoundaryProps) {
  const uri = source ? resolveAssetUri(source) : null;
  const geometry = { borderRadius, height, width };

  return (
    <View
      {...getAccessibilityProps(accessible, accessibilityLabel)}
      style={[styles.container, geometry]}
      testID={testID}
    >
      <View
        pointerEvents="none"
        style={[
          styles.fallback,
          !source && styles.missingFallback,
          geometry,
        ]}
        testID={testID ? `${testID}-placeholder` : undefined}
      />
      {uri ? (
        <Image
          {...getDecorativeImageAccessibilityProps()}
          resizeMode={resizeMode}
          source={{ cache: "force-cache", uri }}
          style={[styles.image, geometry]}
        />
      ) : null}
    </View>
  );
}

function AnimatedAppImage({
  accessible = true,
  accessibilityLabel,
  borderRadius = 0,
  height,
  resizeMode = "cover",
  source,
  testID,
  width,
}: AppImageBoundaryProps) {
  const uri = source ? resolveAssetUri(source) : null;
  const [measuredSize, setMeasuredSize] = useState(() => ({
    height: typeof height === "number" ? height : 0,
    width: typeof width === "number" ? width : 0,
  }));
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

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height: measuredHeight, width: measuredWidth } =
      event.nativeEvent.layout;

    setMeasuredSize((current) =>
      current.height === measuredHeight && current.width === measuredWidth
        ? current
        : { height: measuredHeight, width: measuredWidth },
    );
  };

  const geometry = { borderRadius, height, width };
  const hasMeasuredSize = measuredSize.height > 0 && measuredSize.width > 0;
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
      {...getAccessibilityProps(accessible, accessibilityLabel)}
      onLayout={handleLayout}
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

      {showsPixelLoader && hasMeasuredSize ? (
        <View
          pointerEvents="none"
          style={[styles.pixelLayer, geometry]}
          testID={phase === "error" && testID ? `${testID}-error` : undefined}
        >
          <PixelIconLoader
            borderRadius={borderRadius}
            height={measuredSize.height}
            phase={phase}
            prefersReducedMotion={prefersReducedMotion}
            testID={testID}
            width={measuredSize.width}
          />
        </View>
      ) : null}

      {uri ? (
        <Animated.Image
          {...getDecorativeImageAccessibilityProps()}
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
