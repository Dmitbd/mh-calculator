import rawDivinityTalentConfig from "./divinity-talent-costs.json";
import type {
  DivinityTalentBranchId,
  DivinityTalentConfig,
  DivinityTalentNodeCost,
} from "./types";
import { validateDivinityTalentConfig } from "./validateDivinityTalentConfig";

const rawConfig: unknown = rawDivinityTalentConfig;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value;
}

export const divinityTalentConfig = deepFreeze(
  validateDivinityTalentConfig(rawConfig),
);

export function getDivinityTalentNodeCost(
  config: DivinityTalentConfig,
  branchId: DivinityTalentBranchId,
  level: number,
): DivinityTalentNodeCost {
  const branch = config.branches.find((item) => item.id === branchId);
  const node = branch?.nodes.find((item) => item.level === level);
  const base = config.levelCosts.find((item) => item.level === level);
  if (!node || !base) {
    throw new Error(`Unknown divinity talent node: ${branchId}:${level}`);
  }
  return {
    faith: base.faith,
    inheritedDivinity: node.inheritedDivinity,
    resonanceStone: node.resonanceStone,
  };
}

export type * from "./types";
