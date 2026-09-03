import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "divinity-progress";

export type DivinityProgressRecord = {
  startLevel: number;
  endLevel: number;
  currentLevel: number;
  filledSegments: number;
  autofillEnabled: boolean;
  updatedAt: string;
};

const defaultRecord = (): DivinityProgressRecord => ({
  startLevel: 1,
  endLevel: 30,
  currentLevel: 1,
  filledSegments: 0,
  autofillEnabled: false,
  updatedAt: new Date(0).toISOString(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type DivinityProgressRecordInput = {
  [Key in keyof DivinityProgressRecord]?: DivinityProgressRecord[Key] | null;
};

function hasValidOptionalNumber(
  record: Record<string, unknown>,
  key: keyof DivinityProgressRecord,
): boolean {
  const value = record[key];
  return value == null || (typeof value === "number" && Number.isFinite(value));
}

function isDivinityProgressRecordInput(
  value: unknown,
): value is DivinityProgressRecordInput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasValidOptionalNumber(value, "startLevel") &&
    hasValidOptionalNumber(value, "endLevel") &&
    hasValidOptionalNumber(value, "currentLevel") &&
    hasValidOptionalNumber(value, "filledSegments") &&
    (value.autofillEnabled == null ||
      typeof value.autofillEnabled === "boolean") &&
    (value.updatedAt == null || typeof value.updatedAt === "string")
  );
}

export async function loadDivinityProgress(): Promise<DivinityProgressRecord> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultRecord();
  }

  const parsed: unknown = JSON.parse(storedValue);

  if (!isDivinityProgressRecordInput(parsed)) {
    throw new TypeError("Invalid divinity progress record");
  }

  return {
    startLevel: parsed.startLevel ?? 1,
    endLevel: parsed.endLevel ?? 30,
    currentLevel: parsed.currentLevel ?? 1,
    filledSegments: parsed.filledSegments ?? 0,
    autofillEnabled: parsed.autofillEnabled ?? false,
    updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function saveDivinityProgress(
  progress: Pick<
    DivinityProgressRecord,
    "startLevel" | "endLevel" | "currentLevel" | "filledSegments" | "autofillEnabled"
  >,
): Promise<DivinityProgressRecord> {
  const record: DivinityProgressRecord = {
    startLevel: progress.startLevel,
    endLevel: progress.endLevel,
    currentLevel: progress.currentLevel,
    filledSegments: progress.filledSegments,
    autofillEnabled: progress.autofillEnabled,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  return record;
}

export async function resetDivinityProgress(): Promise<DivinityProgressRecord> {
  const record = defaultRecord();

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  return record;
}
