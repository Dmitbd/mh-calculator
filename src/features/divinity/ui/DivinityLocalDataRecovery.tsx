import { Pressable, StyleSheet, Text, View } from "react-native";

type DivinityLocalDataRecoveryProps = {
  isPending: boolean;
  onRetry: () => void;
  onReset: () => void;
};

export function DivinityLocalDataRecovery({
  isPending,
  onRetry,
  onReset,
}: DivinityLocalDataRecoveryProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="alert" accessible style={styles.message}>
        Ошибка загрузки локальных данных.
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={onRetry}
          style={[styles.button, isPending && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>Повторить</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={onReset}
          style={[styles.button, isPending && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>Сбросить</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 24,
    backgroundColor: "#140d0b",
  },
  message: {
    textAlign: "center",
    fontSize: 16,
    color: "#d7c19a",
  },
  actions: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  button: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffd8b0",
  },
});
