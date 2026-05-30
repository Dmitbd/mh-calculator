import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BranchBuildValidationError } from "../types/admin.types";

type DownloadJsonButtonProps = {
  errors: readonly BranchBuildValidationError[];
  onPress: () => void;
};

export function DownloadJsonButton({ errors, onPress }: DownloadJsonButtonProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Скачать JSON</Text>
      </Pressable>
      {errors.length > 0 ? (
        <View style={styles.errors}>
          {errors.map((error) => (
            <Text key={`${error.code}:${error.path ?? error.message}`} style={styles.errorText}>
              {error.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#795125",
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#fff8e8",
    fontSize: 16,
    fontWeight: "900",
  },
  errors: {
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#79403a",
    backgroundColor: "#261311",
    padding: 12,
  },
  errorText: {
    color: "#ffb8a8",
    fontSize: 13,
    fontWeight: "700",
  },
});
