import { StyleSheet, Text, View } from "react-native";

import type { AntiqueResourceMetadata } from "@/features/game-data/antiques";
import { AppImage } from "@/shared/ui/AppImage";

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
      <AppImage
        accessibilityLabel={resource.label}
        height={size}
        resizeMode="contain"
        source={resource.icon}
        testID={`antique-resource-icon-${resource.kind}`}
        width={size}
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
