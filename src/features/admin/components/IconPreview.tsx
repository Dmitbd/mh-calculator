import { Image, StyleSheet, Text, View } from "react-native";

type IconPreviewProps = {
  source: string | null;
  label: string;
  size?: number;
};

export function IconPreview({ source, label, size = 34 }: IconPreviewProps) {
  if (!source) {
    return (
      <View
        accessibilityLabel={`${label} icon placeholder`}
        style={[styles.placeholder, { width: size, height: size }]}
      >
        <Text style={styles.placeholderText}>{label.slice(0, 1).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${label} icon`}
      source={{ uri: source }}
      style={[styles.image, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 6,
    backgroundColor: "#271610",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#6b5645",
    backgroundColor: "#271610",
  },
  placeholderText: {
    color: "#f2d08b",
    fontSize: 14,
    fontWeight: "800",
  },
});
