import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { BranchBuildValidationError } from "../types/admin.types";

type DownloadJsonButtonProps = {
  errors: readonly BranchBuildValidationError[];
  onErrorsLayout?: (event: LayoutChangeEvent) => void;
  onDownloadFull: () => void;
  onSaveCurrent: () => void;
};

export function DownloadJsonButton({
  errors,
  onErrorsLayout,
  onDownloadFull,
  onSaveCurrent,
}: DownloadJsonButtonProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onSaveCurrent}
          style={[styles.button, styles.secondaryButton]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Сохранить вкладку
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDownloadFull}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Скачать полный JSON</Text>
        </Pressable>
      </View>
      {errors.length > 0 ? (
        <View onLayout={onErrorsLayout} style={styles.errors}>
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
  actions: {
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#8a6a44",
    backgroundColor: "#2c2118",
  },
  buttonText: {
    color: "#fff8e8",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#f6d59a",
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
