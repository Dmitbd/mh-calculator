import { Pressable, StyleSheet, Text, View } from "react-native";

type BuilderActionsProps = {
  backendStatus?: string | null;
  isDirty?: boolean;
  isPublishPending?: boolean;
  isTabSavePending?: boolean;
  mode?: "create" | "edit";
  onPublish: () => void;
  onSaveCurrentTab: () => void;
};

export function BuilderActions({
  backendStatus,
  isDirty = false,
  isPublishPending = false,
  isTabSavePending = false,
  mode = "create",
  onPublish,
  onSaveCurrentTab,
}: BuilderActionsProps) {
  if (mode === "edit") {
    return (
      <View style={styles.wrapper}>
        {isDirty || isPublishPending ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isPublishPending}
              onPress={isPublishPending ? undefined : onPublish}
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

  const isActionPending = isTabSavePending || isPublishPending;

  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isActionPending}
          onPress={isActionPending ? undefined : onSaveCurrentTab}
          style={[
            styles.button,
            styles.secondaryButton,
            isActionPending && styles.buttonDisabled,
          ]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            {isTabSavePending ? "Сохраняем..." : "Сохранить вкладку"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isActionPending}
          onPress={isActionPending ? undefined : onPublish}
          style={[
            styles.button,
            isActionPending && styles.buttonDisabled,
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
