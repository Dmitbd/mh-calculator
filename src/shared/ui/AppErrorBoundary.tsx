import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { reportRuntimeDiagnostic } from "../lib/runtimeDiagnostics";

type AppErrorBoundaryProps = {
  children: ReactNode;
  onGoHome: () => void;
  resetKey?: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    reportRuntimeDiagnostic("runtime-boundary", "recovery-view");
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  private retry = (): void => {
    this.setState({ hasError: false });
  };

  private goHome = (): void => {
    this.props.onGoHome();
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View accessibilityRole="alert" accessible style={styles.screen}>
        <Text style={styles.title}>Не удалось открыть экран</Text>
        <Text style={styles.message}>
          Повторите попытку или вернитесь на главную страницу.
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={this.retry}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Повторить</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={this.goHome}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>На главную</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    minHeight: 320,
    backgroundColor: "#140d0b",
    padding: 24,
  },
  title: {
    color: "#fff8e8",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: "#d7c19a",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: 10,
    marginTop: 6,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#795125",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff8e8",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#8a6a44",
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#2c2118",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#f6d59a",
    fontSize: 15,
    fontWeight: "800",
  },
});
