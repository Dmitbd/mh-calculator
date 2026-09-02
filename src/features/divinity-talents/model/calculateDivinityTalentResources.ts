import {
  getDivinityTalentNodeCost,
  type DivinityTalentConfig,
} from "@/features/game-data/divinity-talents";

import type {
  DivinityTalentRequiredResources,
  DivinityTalentSelections,
} from "./types";

export function calculateDivinityTalentResources(
  config: DivinityTalentConfig,
  selections: DivinityTalentSelections,
): DivinityTalentRequiredResources {
  let selectedNodeCount = 0;
  let faith = 0;
  let inheritedDivinity = 0;
  let resonanceStone = 0;

  config.branches.forEach((branch) => {
    const selection = selections[branch.id];
    if (!selection) {
      return;
    }
    const startLevel = Math.min(selection.a, selection.b);
    const endLevel = Math.max(selection.a, selection.b);
    branch.nodes
      .filter(
        (node) => node.level >= startLevel && node.level <= endLevel,
      )
      .forEach((node) => {
        const nodeCost = getDivinityTalentNodeCost(
          config,
          branch.id,
          node.level,
        );
        selectedNodeCount += 1;
        faith += nodeCost.faith;
        inheritedDivinity += nodeCost.inheritedDivinity;
        resonanceStone += nodeCost.resonanceStone;
      });
  });

  return {
    selectedNodeCount,
    faith,
    inheritedDivinity,
    resonanceStone,
  };
}
