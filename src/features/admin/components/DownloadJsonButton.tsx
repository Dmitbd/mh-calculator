import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { BranchBuildValidationError } from "../types/admin.types";

type DownloadJsonButtonProps = {
  backendStatus?: string | null;
  errors: readonly BranchBuildValidationError[];
  onErrorsLayout?: (event: LayoutChangeEvent) => void;
  onDeleteFull: () => void;
  onDownloadFull: () => void;
  onLoadFull: () => void;
  onPublishFull: () => void;
  onSaveCurrent: () => void;
  onSaveDraft: () => void;
  showAdvancedActions?: boolean;
};

export function DownloadJsonButton({
  backendStatus,
  errors,
  onErrorsLayout,
  onDeleteFull,
  onDownloadFull,
  onLoadFull,
  onPublishFull,
  onSaveCurrent,
  onSaveDraft,
  showAdvancedActions = false,
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
        {showAdvancedActions ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={onDownloadFull}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Скачать полный JSON</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onLoadFull}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Загрузить билд
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onSaveDraft}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Сохранить черновик
              </Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onPublishFull}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Опубликовать</Text>
        </Pressable>
        {showAdvancedActions ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDeleteFull}
            style={[styles.button, styles.dangerButton]}
          >
            <Text style={styles.buttonText}>Удалить билд</Text>
          </Pressable>
        ) : null}
      </View>
      {backendStatus ? (
        <Text style={styles.backendStatus}>{backendStatus}</Text>
      ) : null}
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
  dangerButton: {
    borderWidth: 1,
    borderColor: "#9c5144",
    backgroundColor: "#55231c",
  },
  backendStatus: {
    color: "#e8d7b5",
    fontSize: 13,
    fontWeight: "700",
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
