import AsyncStorage from "@react-native-async-storage/async-storage";

import { divinityTalentConfig } from "@/features/game-data/divinity-talents";

import type {
  DivinityTalentBranchSelection,
  DivinityTalentSelections,
} from "../model/types";

const STORAGE_KEY = "divinity-talents:v1";
const EMPTY_UPDATED_AT = new Date(0).toISOString();
const BRANCH_IDS = ["left", "center", "right"] as const;
const SELECTION_KEYS = ["a", "b", "phase"] as const;
const RECORD_KEYS = ["schemaVersion", "selections", "updatedAt"] as const;

export type DivinityTalentRecord = {
  readonly schemaVersion: 1;
  readonly selections: DivinityTalentSelections;
  readonly updatedAt: string;
};

function createEmptySelections(): DivinityTalentSelections {
  return {
    left: null,
    center: null,
    right: null,
  };
}

function createEmptyRecord(): DivinityTalentRecord {
  return {
    schemaVersion: 1,
    selections: createEmptySelections(),
    updatedAt: EMPTY_UPDATED_AT,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}

function normalizeSelection(
  value: unknown,
  validLevels: ReadonlySet<number>,
): DivinityTalentBranchSelection | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isObject(value) || !hasExactKeys(value, SELECTION_KEYS)) {
    return undefined;
  }

  const { a, b, phase } = value;
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    !validLevels.has(a as number) ||
    !validLevels.has(b as number) ||
    (phase !== "awaitingB" && phase !== "complete") ||
    (phase === "awaitingB" && a !== b)
  ) {
    return undefined;
  }

  return {
    a: a as number,
    b: b as number,
    phase,
  };
}

function normalizeSelections(value: unknown): DivinityTalentSelections | null {
  if (!isObject(value) || !hasExactKeys(value, BRANCH_IDS)) {
    return null;
  }

  const normalized: {
    -readonly [BranchId in keyof DivinityTalentSelections]?: DivinityTalentSelections[BranchId];
  } = {};
  for (const branchId of BRANCH_IDS) {
    const branch = divinityTalentConfig.branches.find(
      (item) => item.id === branchId,
    );
    if (!branch) {
      return null;
    }

    const selection = normalizeSelection(
      value[branchId],
      new Set(branch.nodes.map((node) => node.level)),
    );
    if (selection === undefined) {
      return null;
    }
    normalized[branchId] = selection;
  }

  return normalized as DivinityTalentSelections;
}

function normalizeRecord(value: unknown): DivinityTalentRecord | null {
  if (!isObject(value) || !hasExactKeys(value, RECORD_KEYS)) {
    return null;
  }
  if (value.schemaVersion !== 1 || !isCanonicalTimestamp(value.updatedAt)) {
    return null;
  }

  const selections = normalizeSelections(value.selections);
  if (!selections) {
    return null;
  }

  return {
    schemaVersion: 1,
    selections,
    updatedAt: value.updatedAt,
  };
}

export async function loadDivinityTalentSelections(): Promise<DivinityTalentRecord> {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return createEmptyRecord();
    }

    const parsed: unknown = JSON.parse(storedValue);
    return normalizeRecord(parsed) ?? createEmptyRecord();
  } catch {
    return createEmptyRecord();
  }
}

export async function saveDivinityTalentSelections(
  selections: DivinityTalentSelections,
): Promise<DivinityTalentRecord> {
  const record: DivinityTalentRecord = {
    schemaVersion: 1,
    selections: normalizeSelections(selections) ?? createEmptySelections(),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function resetDivinityTalentSelections(): Promise<DivinityTalentRecord> {
  return saveDivinityTalentSelections(createEmptySelections());
}
