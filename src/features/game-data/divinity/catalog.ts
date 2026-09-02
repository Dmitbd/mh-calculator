import branchesData from "./divinity-branches.json";
import gemChestsData from "./divinity-gem-chests.json";
import skillsData from "./divinity-skills.json";
import treeMetaData from "./divinity-tree-meta.json";
import templateData from "./tree-template.json";
import type {
  DivinityBranch,
  DivinityBranchPointConnector,
  DivinityGemChest,
  DivinityMajorSkill,
  TreeTemplateNode,
} from "./types";

export const divinityBranches = [...(branchesData as DivinityBranch[])].sort(
  (first, second) => first.order - second.order,
);
export const divinitySkills = skillsData as DivinityMajorSkill[];
export const divinityTreeTemplate = templateData as TreeTemplateNode[];
export const divinityBranchPointConnector =
  treeMetaData.branchPointConnector as DivinityBranchPointConnector;
export const divinityGemChests = gemChestsData as DivinityGemChest[];
