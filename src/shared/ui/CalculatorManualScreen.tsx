import { type Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SCREEN_HEADER_HEIGHT, ScreenHeader } from "./ScreenHeader";

const SCREEN_PADDING = 24;
const CARD_GAP = 16;

export type ManualSection = {
  title: string;
  intro?: readonly string[];
  items?: readonly string[];
  footer?: string;
};

export type CalculatorManualScreenProps = {
  fallbackHref: Href;
  intro: string;
  sections: readonly ManualSection[];
  title?: string;
};

export function CalculatorManualScreen({
  fallbackHref,
  intro,
  sections,
  title = "Инструкция",
}: CalculatorManualScreenProps) {
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader fallbackHref={fallbackHref} title="Инструкция" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + top + CARD_GAP,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
        <View style={styles.introCard}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{intro}</Text>
        </View>
        {sections.map((section, sectionIndex) => (
          <View key={`${sectionIndex}-${section.title}`} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.intro?.map((paragraph, paragraphIndex) => (
              <Text
                key={`${sectionIndex}-intro-${paragraphIndex}-${paragraph}`}
                style={styles.body}
              >
                {paragraph}
              </Text>
            ))}
            {section.items?.map((item, itemIndex) => (
              <View
                key={`${sectionIndex}-item-${itemIndex}-${item}`}
                style={styles.listRow}
              >
                <Text style={styles.listMarker}>•</Text>
                <Text style={[styles.body, styles.listItem]}>{item}</Text>
              </View>
            ))}
            {section.footer ? <Text style={styles.body}>{section.footer}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#140d0b",
  },
  container: {
    flexGrow: 1,
    gap: CARD_GAP,
    paddingHorizontal: SCREEN_PADDING,
    backgroundColor: "#140d0b",
  },
  introCard: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#2a160e",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f3d38a",
  },
  sectionCard: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#2a160e",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f3d38a",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#d7c19a",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  listMarker: {
    width: 18,
    fontSize: 16,
    lineHeight: 24,
    color: "#f3d38a",
  },
  listItem: {
    flex: 1,
  },
});
