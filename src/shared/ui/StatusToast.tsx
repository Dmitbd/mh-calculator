import { Pressable, StyleSheet, Text, View } from "react-native";

type StatusToastKind = "success" | "error";

type StatusToastProps = {
  kind: StatusToastKind;
  message: string;
  onDismiss?: () => void;
};

export function StatusToast({ kind, message, onDismiss }: StatusToastProps) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.toast,
        kind === "success" ? styles.successToast : styles.errorToast,
      ]}
    >
      <Text
        style={[
          styles.message,
          kind === "success" ? styles.successText : styles.errorText,
        ]}
      >
        {message}
      </Text>
      {kind === "error" && onDismiss ? (
        <Pressable
          accessibilityLabel="Закрыть сообщение об ошибке"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 200,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  successToast: {
    borderColor: "#4f7b46",
    backgroundColor: "#172516",
  },
  errorToast: {
    borderColor: "#9c5144",
    backgroundColor: "#261311",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  successText: {
    color: "#c9efb9",
  },
  errorText: {
    color: "#ffb8a8",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  closeText: {
    color: "#ffdfd7",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
});
