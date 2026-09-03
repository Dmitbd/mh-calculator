import type { DivinitySkillNodeCost } from "./types";

export const DIVINITY_SKILL_LOADOUT_MAX_SLOTS = 3;
export const DIVINITY_SKILL_BASE_NODE_BUDGET = 6;
export const DIVINITY_SKILL_AWAKENED_NODE_BUDGET = 7;

export function getDivinitySkillNodeCost(
  skill: { nodeCost?: DivinitySkillNodeCost; tier: number },
): DivinitySkillNodeCost {
  return skill.nodeCost ?? (skill.tier as DivinitySkillNodeCost);
}

export function compactDivinitySkillIds(
  skillIds: readonly (string | null | undefined)[],
): string[] {
  return skillIds.filter((skillId): skillId is string => Boolean(skillId));
}

export function getDivinitySkillLoadoutCost(
  skillIds: readonly string[],
  skillsById: ReadonlyMap<string, { nodeCost?: DivinitySkillNodeCost; tier: number }>,
): number {
  return skillIds.reduce((total, skillId) => {
    const skill = skillsById.get(skillId);

    return skill ? total + getDivinitySkillNodeCost(skill) : total;
  }, 0);
}
