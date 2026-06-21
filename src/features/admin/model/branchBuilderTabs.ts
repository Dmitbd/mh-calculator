import type { BuildFolderTabItem } from "@/features/builds/types/buildTabs";
import {
  getTabByPath,
  sortBuildTabs,
} from "@/features/game-data/heroes/heroBuildTabs";
import type { HeroBuildTabPath } from "@/features/game-data/heroes/types";

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
): BranchBuilderTargetTabs {
  const selectedTopTabId = targetTabPath[0] ?? "";
  const selectedChildTabId = targetTabPath[1];
  const selectedTopTab = getTabByPath(buildTargetTabs, [selectedTopTabId]);
  const topTabs = toFolderTabItems(sortBuildTabs(buildTargetTabs));
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
