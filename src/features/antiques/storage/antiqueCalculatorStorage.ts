import AsyncStorage from "@react-native-async-storage/async-storage";

import { getCoinAllocation } from "../model/allocateAntiqueCoins";
import { normalizeAntiqueCount } from "../model/normalizeAntiqueInput";
import type { AntiqueRivalryInput } from "../model/types";

const STORAGE_KEY = "antique-rivalry-calculator";
const EMPTY_UPDATED_AT = new Date(0).toISOString();

export type AntiqueCalculatorInput = {
  coins: number;
  templeMapAllocation: number;
  ownedTombMaps: number;
  ownedTempleMaps: number;
  includeCashback: boolean;
};

export type AntiqueCalculatorRecord = AntiqueCalculatorInput & {
  updatedAt: string;
};

export function createEmptyAntiqueCalculatorInput(): AntiqueCalculatorInput {
  return {
    coins: 0,
    templeMapAllocation: 0,
    ownedTombMaps: 0,
    ownedTempleMaps: 0,
    includeCashback: true,
  };
}

export function normalizeAntiqueCalculatorInput(
  input: Partial<AntiqueRivalryInput>,
): AntiqueCalculatorInput {
  const coins = normalizeAntiqueCount(input.coins);

  return {
    coins,
    templeMapAllocation: getCoinAllocation(
      coins,
      input.templeMapAllocation,
    ).templeMapAllocation,
    ownedTombMaps: normalizeAntiqueCount(input.ownedTombMaps),
    ownedTempleMaps: normalizeAntiqueCount(input.ownedTempleMaps),
    includeCashback: input.includeCashback !== false,
  };
}

function defaultRecord(): AntiqueCalculatorRecord {
  return {
    ...createEmptyAntiqueCalculatorInput(),
    updatedAt: EMPTY_UPDATED_AT,
  };
}

export async function loadAntiqueCalculator(): Promise<AntiqueCalculatorRecord> {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return defaultRecord();
    }

    const parsed = JSON.parse(storedValue) as Partial<AntiqueCalculatorRecord>;

    if (!parsed || typeof parsed !== "object") {
      return defaultRecord();
    }

    const updatedAt =
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : EMPTY_UPDATED_AT;

    return {
      ...normalizeAntiqueCalculatorInput(parsed),
      updatedAt,
    };
  } catch {
    return defaultRecord();
  }
}

export async function saveAntiqueCalculator(
  input: Partial<AntiqueRivalryInput>,
): Promise<AntiqueCalculatorRecord> {
  const record: AntiqueCalculatorRecord = {
    ...normalizeAntiqueCalculatorInput(input),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  return record;
}

export async function resetAntiqueCalculator(): Promise<AntiqueCalculatorRecord> {
  return saveAntiqueCalculator(createEmptyAntiqueCalculatorInput());
}
