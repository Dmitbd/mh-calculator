import { StyleSheet, Text, View } from "react-native";

type ValidationErrorMessagesProps = {
  messages: readonly string[];
};

export function ValidationErrorMessages({
  messages,
}: ValidationErrorMessagesProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {messages.map((message, index) => (
        <Text key={`${message}:${index}`} style={styles.text}>
          {message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  text: {
    color: "#ff8f7f",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
