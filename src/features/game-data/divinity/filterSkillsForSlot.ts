import type { DivinityBranchId, DivinityMajorSkill, DivinitySkillTier } from "./types";

/** Скиллы, доступные для выбора в мажорном слоте ветки и tier */
export function filterSkillsForSlot(
  skills: readonly DivinityMajorSkill[],
  branchId: DivinityBranchId,
  tier: DivinitySkillTier,
): DivinityMajorSkill[] {
  return skills.filter(
    (skill) => skill.branchId === branchId && skill.tier === tier,
  );
}
