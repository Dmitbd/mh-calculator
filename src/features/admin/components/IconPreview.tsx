import { Image, StyleSheet, View } from "react-native";

type IconPreviewProps = {
  source: string | null;
  label: string;
  size?: number;
};

export function IconPreview({ source, label, size = 34 }: IconPreviewProps) {
  if (!source) {
    // Иконки нет — показываем пустой круг с пунктирной обводкой
    return (
      <View
        accessibilityLabel={`${label} icon placeholder`}
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
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
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#6b5645",
    backgroundColor: "transparent",
  },
});
