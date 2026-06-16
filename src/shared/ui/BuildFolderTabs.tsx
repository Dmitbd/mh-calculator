import { Pressable, StyleSheet, Text, View } from "react-native";

export type BuildFolderTabItem = {
  /** Id вкладки */
  id: string;
  /** Подпись */
  label: string;
  /** Accessibility label */
  accessibilityLabel: string;
};

type BuildFolderTabsProps = {
  /** Вкладки верхнего уровня */
  tabs: BuildFolderTabItem[];
  /** Id выбранной верхней вкладки */
  selectedTabId: string;
  /** Выбор верхней вкладки */
  onSelectTab: (tabId: string) => void;
  /** Дочерние вкладки (вторая строка) */
  childTabs?: BuildFolderTabItem[];
  /** Id выбранной дочерней вкладки */
  selectedChildTabId?: string;
  /** Выбор дочерней вкладки */
  onSelectChildTab?: (tabId: string) => void;
};

/** Фон контента под вкладками — активная вкладка сливается с ним */
const CONTENT_BACKGROUND = "#140d0b";
const BORDER_DIVIDER = "#f0c36a";

/**
 * Активная: жёлтый верх + жёлтый бок к соседу.
 * Неактивная: только жёлтый низ.
 */
function getTopTabBorders(index: number, total: number, selected: boolean) {
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  if (selected) {
    return {
      borderTopWidth: 1,
      borderTopColor: BORDER_DIVIDER,
      borderBottomWidth: 0,
      borderLeftWidth: hasPrev ? 1 : 0,
      borderLeftColor: BORDER_DIVIDER,
      borderRightWidth: hasNext ? 1 : 0,
      borderRightColor: BORDER_DIVIDER,
    };
  }

  return {
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DIVIDER,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  };
}

/** Папочные вкладки для выбора контекста билда */
export function BuildFolderTabs({
  tabs,
  selectedTabId,
  onSelectTab,
  childTabs,
  selectedChildTabId,
  onSelectChildTab,
}: BuildFolderTabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedTabId;
          const borderTotal = tabs.length === 1 ? 2 : tabs.length;

          return (
            <Pressable
              accessibilityLabel={tab.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              style={[
                styles.tab,
                getTopTabBorders(index, borderTotal, selected),
                selected ? styles.tabActive : styles.tabInactive,
                index > 0 ? styles.tabAdjacent : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tabText,
                  selected ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}

        {tabs.length === 1 ? (
          <View
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[
              styles.tab,
              styles.tabInactive,
              getTopTabBorders(1, 2, false),
              styles.tabAdjacent,
            ]}
          />
        ) : null}
      </View>

      {childTabs && childTabs.length > 0 ? (
        <View style={styles.childRadioRow}>
          {childTabs.map((tab) => {
            const selected = tab.id === selectedChildTabId;

            return (
              <Pressable
                accessibilityLabel={tab.accessibilityLabel}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={tab.id}
                onPress={() => onSelectChildTab?.(tab.id)}
                style={[styles.childRadioOption, selected && styles.childRadioOptionSelected]}
              >
                <View
                  style={[styles.childRadioIndicator, selected && styles.childRadioIndicatorSelected]}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.childRadioText, selected && styles.childRadioTextSelected]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    alignItems: "flex-end",
  },
  childRadioRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 10,
  },
  tab: {
    minWidth: 72,
    flexGrow: 1,
    flexBasis: "30%",
    maxWidth: "50%",
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: CONTENT_BACKGROUND,
    zIndex: 2,
  },
  tabInactive: {
    backgroundColor: "#1a100c",
  },
  tabAdjacent: {
    marginLeft: -1,
  },
  tabText: {
    fontSize: 14,
  },
  tabTextInactive: {
    color: "#6a5a48",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff6df",
    fontWeight: "800",
  },
  childRadioOption: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#241610",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  childRadioOptionSelected: {
    borderColor: BORDER_DIVIDER,
    backgroundColor: "#3a2415",
  },
  childRadioIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#917968",
    backgroundColor: "#1c110d",
  },
  childRadioIndicatorSelected: {
    borderColor: BORDER_DIVIDER,
    backgroundColor: BORDER_DIVIDER,
  },
  childRadioText: {
    flexShrink: 1,
    color: "#d8c4a8",
    fontSize: 14,
    fontWeight: "700",
  },
  childRadioTextSelected: {
    color: "#fff6df",
  },
});
