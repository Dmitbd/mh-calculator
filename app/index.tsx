import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
});
