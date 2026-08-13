import { useState } from "react";
import {
  Image,
  type ImageResizeMode,
  StyleSheet,
  View,
} from "react-native";

import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

type AppImageStatus = "error" | "loaded" | "loading";

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
  const [imageState, setImageState] = useState<{
    status: AppImageStatus;
    uri: string | null;
  }>({
    status: "loading",
    uri,
  });
  const status = imageState.uri === uri ? imageState.status : "loading";

  const geometry = { borderRadius, height, width };
  const fallbackStatus = source ? status : "loading";

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.container, geometry]}
      testID={testID}
    >
      {status !== "loaded" ? (
        <View
          pointerEvents="none"
          style={[
            styles.fallback,
            !source && styles.missingFallback,
            fallbackStatus === "error" && styles.errorFallback,
            geometry,
          ]}
          testID={
            testID
              ? fallbackStatus === "error"
                ? `${testID}-error`
                : `${testID}-placeholder`
              : undefined
          }
        />
      ) : null}

      {uri ? (
        <Image
          accessible={false}
          onError={() => setImageState({ status: "error", uri })}
          onLoad={() => setImageState({ status: "loaded", uri })}
          resizeMode={resizeMode}
          source={{ cache: "force-cache", uri }}
          style={[styles.image, geometry, status !== "loaded" && styles.hidden]}
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
  errorFallback: {
    borderColor: "#8f4f45",
    backgroundColor: "#321914",
  },
});
