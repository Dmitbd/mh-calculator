import type { HeroBuildSet, HeroBuildTab } from "@/features/game-data/heroes";
import { getHeroBuildSet } from "@/features/game-data/heroes";

import { buildTargetTabs } from "../data/buildTargetTabs";
import {
  createPublishedBuilderEditState,
  getFirstInvalidPublishedBuild,
  isPublishedBuilderDirty,
} from "../model/publishedBuilderEditModel";

function cloneCompleteBuildSet(): HeroBuildSet {
  const source = getHeroBuildSet("bastet");

  if (!source) {
    throw new Error("Expected complete build set.");
  }

  return JSON.parse(JSON.stringify(source)) as HeroBuildSet;
}

function visitBuildTabs(
  tabs: HeroBuildTab[],
  visit: (tab: HeroBuildTab) => void,
) {
  tabs.forEach((tab) => {
    visit(tab);

    if (tab.children) {
      visitBuildTabs(tab.children, visit);
    }
  });
}

describe("publishedBuilderEditModel", () => {
  it("clones the published baseline and creates an editable draft for every leaf", () => {
    const buildSet = cloneCompleteBuildSet();
    const state = createPublishedBuilderEditState(buildSet, buildTargetTabs);

    expect(state).not.toBeNull();
    expect(Object.keys(state!.draftsByPath)).toEqual([
      "pvp",
      "pve/bosses",
      "pve/campaign",
    ]);

    state!.draftsByPath.pvp.selectedArtifactIds.push("excalibur");

    expect(
      state!.baselineBuildsByPath.pvp.equipment.artifactIds,
    ).not.toContain("excalibur");
    expect(buildSet.tabs[0].build?.equipment.artifactIds).not.toContain(
      "excalibur",
    );
  });

  it("does not mark timestamp-only metadata changes as dirty", () => {
    const original = cloneCompleteBuildSet();
    const originalState = createPublishedBuilderEditState(
      original,
      buildTargetTabs,
    );
    const timestampChanged = cloneCompleteBuildSet();

    visitBuildTabs(timestampChanged.tabs, (tab) => {
      if (tab.build) {
        tab.build.metadata.createdAt = "2026-08-13T12:00:00.000Z";
      }
    });

    const timestampState = createPublishedBuilderEditState(
      timestampChanged,
      buildTargetTabs,
    );

    expect(originalState).not.toBeNull();
    expect(timestampState).not.toBeNull();
    expect(
      isPublishedBuilderDirty(
        timestampState!.baselineBuildsByPath,
        originalState!.draftsByPath,
      ),
    ).toBe(false);
  });

  it("returns the first invalid tab, relative path and editor section", () => {
    expect(
      getFirstInvalidPublishedBuild(
        [
          {
            code: "majorNode.required",
            message: "PvE -> Кампания: Заполните слот.",
            path: "pve/campaign.majorNodes.center.1",
          },
        ],
        buildTargetTabs,
      ),
    ).toEqual({
      tabPath: ["pve", "campaign"],
      path: "majorNodes.center.1",
      section: "branchGrid",
    });
  });

  it("keeps additional recursive published leaves in the edit session", () => {
    const buildSet = cloneCompleteBuildSet();
    const pvpBuild = buildSet.tabs[0].build!;
    buildSet.tabs.push({
      id: "events",
      label: "События",
      order: 3,
      kind: "group",
      gameMode: "pve",
      build: null,
      children: [
        {
          id: "rivalry",
          label: "Соперничество",
          order: 1,
          kind: "build",
          build: { ...pvpBuild, gameMode: "pve" },
        },
      ],
    });

    const state = createPublishedBuilderEditState(buildSet, buildTargetTabs);

    expect(state?.draftsByPath["events/rivalry"]).toBeTruthy();
    expect(state?.targetTabs).toHaveLength(3);
    expect(state && isPublishedBuilderDirty(
      state.baselineBuildsByPath,
      state.draftsByPath,
    )).toBe(false);
  });
});
