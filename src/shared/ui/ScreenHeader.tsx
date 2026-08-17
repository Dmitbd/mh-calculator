import { type Href, router } from "expo-router";
import { useEffect, useRef } from "react";
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
  /** Разрешает экрану асинхронно подтвердить уход назад */
  onBeforeBack?: () => boolean | Promise<boolean>;
};

/** Единая фиксированная шапка внутренних экранов с кнопкой "назад" */
export function ScreenHeader({
  title,
  fallbackHref = "/",
  onBeforeBack,
}: ScreenHeaderProps) {
  const { top } = useSafeAreaInsets();
  const isBackPending = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleBack = async () => {
    if (isBackPending.current) {
      return;
    }

    isBackPending.current = true;

    try {
      if (onBeforeBack && !(await onBeforeBack())) {
        return;
      }

      if (!isMounted.current) {
        return;
      }

      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace(fallbackHref);
    } catch {
      // Перехватчик ухода может зависеть от нативного диалога: ошибка запрещает уход.
    } finally {
      if (isMounted.current) {
        isBackPending.current = false;
      }
    }
  };

  return (
    <View
      testID="screen-header"
      style={[
        styles.headerShell,
        { paddingTop: top, height: SCREEN_HEADER_HEIGHT + top },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Назад"
          accessibilityRole="button"
          onPress={() => void handleBack()}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#140d0b",
    paddingHorizontal: HORIZONTAL_PADDING,
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
    minWidth: 0,
    flex: 1,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
    color: "#f3d38a",
    textShadowColor: "rgba(56, 25, 8, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
