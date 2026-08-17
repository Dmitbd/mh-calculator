import {
  normalizeSummonPurchaseCount,
} from "./normalizeSummonRivalryInput";
import type { SummonPurchaseCosts } from "./types";

type SummonPurchaseInput = {
  commonScrolls?: unknown;
  limitedScrolls?: unknown;
  fateCrystals?: unknown;
};

export function calculateSummonPurchaseCosts(
  input: SummonPurchaseInput,
): SummonPurchaseCosts {
  const commonScrolls = normalizeSummonPurchaseCount(input.commonScrolls) * 270;
  const limitedScrolls =
    normalizeSummonPurchaseCount(input.limitedScrolls) * 300;
  const fateCrystals = normalizeSummonPurchaseCount(input.fateCrystals) * 500;

  return {
    commonScrolls,
    limitedScrolls,
    fateCrystals,
    total: commonScrolls + limitedScrolls + fateCrystals,
  };
}
