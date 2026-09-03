import type {
  BuildFolderTabItem,
  HeroBuildTab,
  HeroBuildTabPath,
} from "@/features/builds";
import {
  getTabByPath,
  sortBuildTabs,
} from "@/features/game-data/heroes";

import { buildTargetTabs } from "../data/buildTargetTabs";

type BranchBuilderTargetTabs = {
  childTabs?: BuildFolderTabItem[];
  selectedChildTabId?: string;
  selectedTopTabId: string;
  topTabs: BuildFolderTabItem[];
};

function toFolderTabItems(
  tabs: ReturnType<typeof sortBuildTabs>,
): BuildFolderTabItem[] {
  return tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    accessibilityLabel: `Select ${tab.label} build tab`,
  }));
}

export function getBranchBuilderTargetTabs(
  targetTabPath: HeroBuildTabPath,
  targetTabs: readonly HeroBuildTab[] = buildTargetTabs,
): BranchBuilderTargetTabs {
  const selectedTopTabId = targetTabPath[0] ?? "";
  const selectedChildTabId = targetTabPath[1];
  const selectedTopTab = getTabByPath([...targetTabs], [selectedTopTabId]);
  const topTabs = toFolderTabItems(sortBuildTabs([...targetTabs]));
  const childTabs =
    selectedTopTab?.children && selectedTopTab.children.length > 0
      ? toFolderTabItems(sortBuildTabs(selectedTopTab.children))
      : undefined;

  return {
    childTabs,
    selectedChildTabId,
    selectedTopTabId,
    topTabs,
  };
}
