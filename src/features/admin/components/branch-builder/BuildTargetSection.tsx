import { View } from "react-native";

import {
  BuildFolderTabs,
  type BuildFolderTabItem,
} from "@/shared/ui/BuildFolderTabs";

type BuildTargetSectionProps = {
  childTabs?: BuildFolderTabItem[];
  onSelectChildTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  selectedChildTabId?: string;
  selectedTabId: string;
  tabs: BuildFolderTabItem[];
};

export function BuildTargetSection({
  childTabs,
  onSelectChildTab,
  onSelectTab,
  selectedChildTabId,
  selectedTabId,
  tabs,
}: BuildTargetSectionProps) {
  return (
    <View>
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
