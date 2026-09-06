import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_VERSION, LATEST_RELEASE_URL } from "@/shared/lib/appVersion";

const BUTTON_HEIGHT = 54;

export default function HomeScreen() {
  const { top, bottom, left, right } = useSafeAreaInsets();

  return (
    <View
      testID="home-screen"
      style={[
        styles.screen,
        { paddingTop: top, paddingLeft: left, paddingRight: right },
      ]}
    >
      <ScrollView
        testID="home-navigation"
        style={styles.scroll}
        contentContainerStyle={styles.container}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Калькуляторы</Text>
          <View style={styles.calculatorList}>
            <Link href="/divinity" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Божественность</Text>
              </Pressable>
            </Link>
            <Link href="/divinity-talents" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Дерево навыков</Text>
              </Pressable>
            </Link>
            <Link href="/antiques" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Антиквариат</Text>
              </Pressable>
            </Link>
            <Link href="/summon-rivalry" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Призыв</Text>
              </Pressable>
            </Link>
            <Link href="/weekly-rivalry/tower-of-babel" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Вавилонская башня</Text>
              </Pressable>
            </Link>
            <Link href="/weekly-rivalry/zodiac-map" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Карта зодиака</Text>
              </Pressable>
            </Link>
            <Link href="/weekly-rivalry/beastly-echoes" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Звериные эхо</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Билды</Text>
          <Link href="/heroes" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Билды героев</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.divider} />

        <Link href="/admin/branch-builder" asChild>
          <Pressable style={builderButtonStyle}>
            <Text style={[styles.buttonText, styles.builderButtonText]}>
              Builder
            </Text>
          </Pressable>
        </Link>

      </ScrollView>
      <View
        testID="home-footer"
        style={[styles.footer, { paddingBottom: Math.max(bottom, 8) }]}
      >
        <Link href={LATEST_RELEASE_URL} asChild>
          <Pressable
            accessibilityLabel={`Версия ${APP_VERSION}. Что нового`}
            style={styles.releaseLink}
          >
            <Text style={styles.releaseVersion}>Версия {APP_VERSION}</Text>
            <Text style={styles.releaseSeparator}>·</Text>
            <Text style={styles.releaseAction}>Что нового</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4efe6",
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: "#f4efe6",
  },
  section: {
    alignItems: "center",
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#4f5b66",
  },
  calculatorList: {
    gap: 12,
  },
  divider: {
    width: 220,
    height: 1,
    marginTop: 20,
    marginBottom: BUTTON_HEIGHT * 2,
    backgroundColor: "#d8cdbb",
  },
  button: {
    width: 246,
    minWidth: 220,
    maxWidth: "100%",
    borderRadius: 16,
    backgroundColor: "#9a3412",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#fff7ed",
  },
  builderButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#cabfad",
  },
  builderButtonText: {
    color: "#8a8170",
    fontWeight: "500",
  },
  footer: {
    flexShrink: 0,
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#d8cdbb",
    backgroundColor: "#ebe3d6",
  },
  releaseLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  releaseVersion: {
    color: "#8a8170",
    fontSize: 12,
    fontWeight: "600",
  },
  releaseSeparator: {
    color: "#b0a594",
    fontSize: 12,
  },
  releaseAction: {
    color: "#8a5c42",
    fontSize: 12,
    fontWeight: "700",
  },
});

const builderButtonStyle = StyleSheet.flatten([
  styles.button,
  styles.builderButton,
]);
