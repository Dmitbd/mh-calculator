import { StyleSheet, Text, View } from "react-native";

type WeeklyRivalryZoneHeadingProps = {
  title: string;
  description: string;
};

export function WeeklyRivalryZoneHeading({
  title,
  description,
}: WeeklyRivalryZoneHeadingProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#a87943",
    paddingLeft: 12,
  },
  title: { color: "#f3d38a", fontSize: 24, fontWeight: "900" },
  description: { color: "#bea17b", fontSize: 13, lineHeight: 19 },
});
