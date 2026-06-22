import { StyleSheet, View } from "react-native";

import { BuildFolderTabs, type BuildFolderTabItem } from "@/features/builds";

import { ValidationErrorMessages } from "../ValidationErrorMessages";

type BuildTargetSectionProps = {
  childTabs?: BuildFolderTabItem[];
  errors: readonly string[];
  onSelectChildTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  selectedChildTabId?: string;
  selectedTabId: string;
  tabs: BuildFolderTabItem[];
};

export function BuildTargetSection({
  childTabs,
  errors,
  onSelectChildTab,
  onSelectTab,
  selectedChildTabId,
  selectedTabId,
  tabs,
}: BuildTargetSectionProps) {
  return (
    <View style={styles.wrapper}>
      <ValidationErrorMessages messages={errors} />
      <BuildFolderTabs
        childTabs={childTabs}
        onSelectChildTab={onSelectChildTab}
        onSelectTab={onSelectTab}
        selectedChildTabId={selectedChildTabId}
        selectedTabId={selectedTabId}
        tabs={tabs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
});
