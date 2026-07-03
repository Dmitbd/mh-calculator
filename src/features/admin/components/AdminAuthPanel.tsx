import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type AdminAuthPanelProps = {
  adminEmail?: string | null;
  onSignIn: (credentials: { email: string; password: string }) => void;
  onSignOut: () => void;
};

export function AdminAuthPanel({
  adminEmail,
  onSignIn,
  onSignOut,
}: AdminAuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (adminEmail) {
    return (
      <View style={styles.panel}>
        <View style={styles.signedInRow}>
          <Text style={styles.label}>Админ</Text>
          <Text style={styles.email}>{adminEmail}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={[styles.button, styles.secondaryButton]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Выйти
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Админ</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#8e7758"
        style={styles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Пароль"
        placeholderTextColor="#8e7758"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onSignIn({ email, password });
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Войти</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a2a1d",
    backgroundColor: "#1d130f",
    padding: 14,
  },
  signedInRow: {
    gap: 4,
  },
  label: {
    color: "#f6d59a",
    fontSize: 14,
    fontWeight: "900",
  },
  email: {
    color: "#fff8e8",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5a412b",
    color: "#fff8e8",
    paddingHorizontal: 12,
  },
  button: {
    minHeight: 44,
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
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#f6d59a",
  },
});
