import { View } from "react-native";

import { BuildFolderTabs, type BuildFolderTabItem } from "@/features/builds";

type HeroBuildTabsSectionProps = {
  childTabs: BuildFolderTabItem[];
  onSelectChildTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  selectedChildTabId?: string;
  selectedTabId: string;
  tabs: BuildFolderTabItem[];
};

export function HeroBuildTabsSection({
  childTabs,
  onSelectChildTab,
  onSelectTab,
  selectedChildTabId,
  selectedTabId,
  tabs,
}: HeroBuildTabsSectionProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <View>
      <BuildFolderTabs
        childTabs={childTabs.length > 0 ? childTabs : undefined}
        onSelectChildTab={onSelectChildTab}
        onSelectTab={onSelectTab}
        selectedChildTabId={selectedChildTabId}
        selectedTabId={selectedTabId}
        tabs={tabs}
      />
    </View>
  );
}
