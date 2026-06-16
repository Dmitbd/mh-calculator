import { type Href, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Высота шапки без учёта системного отступа */
export const SCREEN_HEADER_HEIGHT = 76;

const HORIZONTAL_PADDING = 24;

type ScreenHeaderProps = {
  /** Заголовок по центру */
  title: string;
  /** Куда вести "назад", если в истории пусто */
  fallbackHref?: Href;
};

/** Фиксированная шапка экрана с кнопкой "назад" (паттерн экрана божественности) */
export function ScreenHeader({ title, fallbackHref = "/" }: ScreenHeaderProps) {
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerShell,
        { paddingTop: top, height: SCREEN_HEADER_HEIGHT + top },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Назад"
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace(fallbackHref);
          }}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <View pointerEvents="none" style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#140d0b",
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: "#533b29",
  },
  headerRow: {
    height: SCREEN_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#140d0b",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 32,
    height: 32,
  },
  backArrow: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "900",
    color: "#f3d38a",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.2,
    color: "#f3d38a",
    textShadowColor: "rgba(56, 25, 8, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
