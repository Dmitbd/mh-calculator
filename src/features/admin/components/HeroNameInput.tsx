import { StyleSheet, Text, TextInput, View } from "react-native";

type HeroNameInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HeroNameInput({ value, onChange }: HeroNameInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Hero</Text>
      <TextInput
        accessibilityLabel="Hero name"
        onChangeText={onChange}
        placeholder="Hero name"
        placeholderTextColor="#917968"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#241610",
    color: "#fff8ed",
    fontSize: 16,
    paddingHorizontal: 14,
  },
});
