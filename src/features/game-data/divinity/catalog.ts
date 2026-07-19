import branchesData from "./divinity-branches.json";
import gemChestsData from "./divinity-gem-chests.json";
import skillsData from "./divinity-skills.json";
import templateData from "./tree-template.json";
import type {
  DivinityBranch,
  DivinityGemChest,
  DivinityMajorSkill,
  TreeTemplateNode,
} from "./types";

export const divinityBranches = [...(branchesData as DivinityBranch[])].sort(
  (first, second) => first.order - second.order,
);
export const divinitySkills = skillsData as DivinityMajorSkill[];
export const divinityTreeTemplate = templateData as TreeTemplateNode[];
export const divinityGemChests = gemChestsData as DivinityGemChest[];
