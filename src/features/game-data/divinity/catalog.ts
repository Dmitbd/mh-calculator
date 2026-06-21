import branchesData from "./divinity-branches.json";
import skillsData from "./divinity-skills.json";
import templateData from "./tree-template.json";
import type {
  DivinityBranch,
  DivinityMajorSkill,
  TreeTemplateNode,
} from "./types";

export const divinityBranches = [...(branchesData as DivinityBranch[])].sort(
  (first, second) => first.order - second.order,
);
export const divinitySkills = skillsData as DivinityMajorSkill[];
export const divinityTreeTemplate = templateData as TreeTemplateNode[];
