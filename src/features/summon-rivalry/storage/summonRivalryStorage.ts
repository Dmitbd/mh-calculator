import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeSummonCount,
  normalizeSummonPurchaseCount,
} from "../model/normalizeSummonRivalryInput";
import type { SummonRivalryInput } from "../model/types";

const STORAGE_KEY = "summon-rivalry-calculator:v1";
const EMPTY_UPDATED_AT = new Date(0).toISOString();

export type SummonRivalryCalculatorInput = {
  ownedCommonScrolls: number;
  ownedLimitedScrolls: number;
  ownedFactionScrolls: number;
  ownedFateCrystals: number;
  purchasedCommonScrolls: number;
  purchasedLimitedScrolls: number;
  purchasedFateCrystals: number;
  includeCashback: boolean;
};

export type SummonRivalryCalculatorRecord = SummonRivalryCalculatorInput & {
  schemaVersion: 1;
  updatedAt: string;
};

export function createEmptySummonRivalryInput(): SummonRivalryCalculatorInput {
  return {
    ownedCommonScrolls: 0,
    ownedLimitedScrolls: 0,
    ownedFactionScrolls: 0,
    ownedFateCrystals: 0,
    purchasedCommonScrolls: 0,
    purchasedLimitedScrolls: 0,
    purchasedFateCrystals: 0,
    includeCashback: true,
  };
}

export function normalizeSummonRivalryCalculatorInput(
  input: Partial<SummonRivalryInput>,
): SummonRivalryCalculatorInput {
  return {
    ownedCommonScrolls: normalizeSummonCount(input.ownedCommonScrolls),
    ownedLimitedScrolls: normalizeSummonCount(input.ownedLimitedScrolls),
    ownedFactionScrolls: normalizeSummonCount(input.ownedFactionScrolls),
    ownedFateCrystals: normalizeSummonCount(input.ownedFateCrystals),
    purchasedCommonScrolls: normalizeSummonPurchaseCount(
      input.purchasedCommonScrolls,
    ),
    purchasedLimitedScrolls: normalizeSummonPurchaseCount(
      input.purchasedLimitedScrolls,
    ),
    purchasedFateCrystals: normalizeSummonPurchaseCount(
      input.purchasedFateCrystals,
    ),
    includeCashback: input.includeCashback !== false,
  };
}

function defaultRecord(): SummonRivalryCalculatorRecord {
  return {
    schemaVersion: 1,
    ...createEmptySummonRivalryInput(),
    updatedAt: EMPTY_UPDATED_AT,
  };
}

export async function loadSummonRivalryCalculator(): Promise<SummonRivalryCalculatorRecord> {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return defaultRecord();
    }

    const parsed = JSON.parse(storedValue) as Partial<SummonRivalryCalculatorRecord>;
    if (!parsed || typeof parsed !== "object") {
      return defaultRecord();
    }

    return {
      schemaVersion: 1,
      ...normalizeSummonRivalryCalculatorInput(parsed),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : EMPTY_UPDATED_AT,
    };
  } catch {
    return defaultRecord();
  }
}

export async function saveSummonRivalryCalculator(
  input: Partial<SummonRivalryInput>,
): Promise<SummonRivalryCalculatorRecord> {
  const record: SummonRivalryCalculatorRecord = {
    schemaVersion: 1,
    ...normalizeSummonRivalryCalculatorInput(input),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function resetSummonRivalryCalculator(): Promise<SummonRivalryCalculatorRecord> {
  return saveSummonRivalryCalculator(createEmptySummonRivalryInput());
}
