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
  isDirty?: boolean;
  isPublishPending?: boolean;
  isTabSavePending?: boolean;
  mode?: "create" | "edit";
  onErrorsLayout?: (event: LayoutChangeEvent) => void;
  onDownloadFull: () => void;
  onLoadFull: () => void;
  onPublishFull: () => void;
  onSaveCurrent: () => void;
  onSaveDraft: () => void;
  showAdvancedActions?: boolean;
};

export function DownloadJsonButton({
  backendStatus,
  isDirty = false,
  isPublishPending = false,
  isTabSavePending = false,
  mode = "create",
  onDownloadFull,
  onLoadFull,
  onPublishFull,
  onSaveCurrent,
  onSaveDraft,
  showAdvancedActions = false,
}: DownloadJsonButtonProps) {
  if (mode === "edit") {
    return (
      <View style={styles.wrapper}>
        {isDirty || isPublishPending ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isPublishPending}
              onPress={isPublishPending ? undefined : onPublishFull}
              style={[
                styles.button,
                isPublishPending && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {isPublishPending ? "Обновляем..." : "Обновить"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {backendStatus ? (
          <Text style={styles.backendStatus}>{backendStatus}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isTabSavePending || isPublishPending}
          onPress={
            isTabSavePending || isPublishPending ? undefined : onSaveCurrent
          }
          style={[
            styles.button,
            styles.secondaryButton,
            (isTabSavePending || isPublishPending) && styles.buttonDisabled,
          ]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            {isTabSavePending ? "Сохраняем..." : "Сохранить вкладку"}
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
          disabled={isTabSavePending || isPublishPending}
          onPress={
            isTabSavePending || isPublishPending ? undefined : onPublishFull
          }
          style={[
            styles.button,
            (isTabSavePending || isPublishPending) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {isPublishPending ? "Публикуем..." : "Опубликовать"}
          </Text>
        </Pressable>
      </View>
      {backendStatus ? (
        <Text style={styles.backendStatus}>{backendStatus}</Text>
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
  buttonDisabled: {
    opacity: 0.72,
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
  backendStatus: {
    color: "#e8d7b5",
    fontSize: 13,
    fontWeight: "700",
  },
});
