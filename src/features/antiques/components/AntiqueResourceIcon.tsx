import { Image, StyleSheet, Text, View } from "react-native";

import type { AntiqueResourceMetadata } from "@/features/game-data/antiques";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

type AntiqueResourceIconProps = {
  resource: AntiqueResourceMetadata;
  size?: number;
};

export function AntiqueResourceIcon({
  resource,
  size = 32,
}: AntiqueResourceIconProps) {
  if (resource.icon) {
    return (
      <Image
        accessibilityLabel={resource.label}
        resizeMode="contain"
        source={{ uri: resolveAssetUri(resource.icon) }}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`${resource.label}: иконка недоступна`}
      style={[styles.fallback, { width: size, height: size }]}
    >
      <Text allowFontScaling={false} style={styles.fallbackText}>
        {resource.fallbackLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8f744d",
    backgroundColor: "#2a1e16",
  },
  fallbackText: {
    color: "#f4d89a",
    fontSize: 11,
    fontWeight: "700",
  },
});
