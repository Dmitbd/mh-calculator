import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BUTTON_HEIGHT = 54;

export default function HomeScreen() {
  const { bottom } = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: 24, paddingBottom: 24 + bottom },
      ]}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Калькуляторы</Text>
        <View style={styles.calculatorList}>
          <Link href="/divinity" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Божественность</Text>
            </Pressable>
          </Link>
          <Link href="/antiques" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Антиквариат</Text>
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
            build builder
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4efe6",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
    minWidth: 220,
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
});

const builderButtonStyle = StyleSheet.flatten([
  styles.button,
  styles.builderButton,
]);
