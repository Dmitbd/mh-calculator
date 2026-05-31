import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Высота кнопки (паддинги + текст)
const BUTTON_HEIGHT = 54;

// Главный экран с выбором калькулятора
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MH Calculator</Text>
      <Text style={styles.subtitle}>Выбери калькулятор для запуска.</Text>
      <Link href="/divinity" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Божественность</Text>
        </Pressable>
      </Link>

      <View style={styles.divider} />

      <Link href="/admin/branch-builder" asChild>
        <Pressable style={builderButtonStyle}>
          <Text style={[styles.buttonText, styles.builderButtonText]}>
            build builder
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f4efe6",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#17212b",
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    color: "#4f5b66",
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
  // Приглушённый служебный стиль кнопки (не для обычных юзеров)
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

// Сплющенный стиль: Link с asChild не принимает массив стилей у ребёнка
const builderButtonStyle = StyleSheet.flatten([
  styles.button,
  styles.builderButton,
]);
