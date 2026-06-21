import { getBranchBuilderTargetTabs } from "../model/branchBuilderTabs";

describe("branchBuilderTabs", () => {
  it("derives top and child tab view models for the selected target path", () => {
    const tabs = getBranchBuilderTargetTabs(["pve", "campaign"]);

    expect(tabs.selectedTopTabId).toBe("pve");
    expect(tabs.selectedChildTabId).toBe("campaign");
    expect(tabs.topTabs.map((tab) => tab.id)).toEqual(["pvp", "pve"]);
    expect(tabs.topTabs[0].accessibilityLabel).toBe("Select PvP build tab");
    expect(tabs.childTabs?.map((tab) => tab.id)).toEqual(["bosses", "campaign"]);
  });

  it("omits child tabs when the selected target has no children", () => {
    const tabs = getBranchBuilderTargetTabs(["pvp"]);

    expect(tabs.selectedTopTabId).toBe("pvp");
    expect(tabs.selectedChildTabId).toBeUndefined();
    expect(tabs.childTabs).toBeUndefined();
  });
});
