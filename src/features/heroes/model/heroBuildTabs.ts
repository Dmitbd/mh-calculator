import type { BuildFolderTabItem } from "@/features/builds";
import {
  getTabByPath,
  sortBuildTabs,
  type HeroBuildTab,
  type HeroBuildTabPath,
} from "@/features/game-data/heroes";

function toFolderTabItems(tabs: readonly HeroBuildTab[]): BuildFolderTabItem[] {
  return sortBuildTabs([...tabs]).map((tab) => ({
    id: tab.id,
    label: tab.label,
    accessibilityLabel: `Select ${tab.label} build tab`,
  }));
}

export function getHeroBuildTabViewModel(
  tabs: readonly HeroBuildTab[],
  activePath: HeroBuildTabPath,
) {
  const activeTopId = activePath[0] ?? "";
  const activeChildId = activePath[1];
  const activeTopTab = getTabByPath([...tabs], [activeTopId]);
  const childTabs =
    activeTopTab?.kind === "group" && activeTopTab.children
      ? sortBuildTabs(activeTopTab.children)
      : [];

  return {
    activeChildId,
    activeTopId,
    childFolderTabs: toFolderTabItems(childTabs),
    topFolderTabs: toFolderTabItems(tabs),
  };
}
