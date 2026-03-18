import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "divinity-progress";

export type DivinityProgressRecord = {
  startLevel: number;
  endLevel: number;
  currentLevel: number;
  filledSegments: number;
  updatedAt: string;
};

const defaultRecord = (): DivinityProgressRecord => ({
  startLevel: 1,
  endLevel: 30,
  currentLevel: 1,
  filledSegments: 0,
  updatedAt: new Date(0).toISOString(),
});

export async function loadDivinityProgress(): Promise<DivinityProgressRecord> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultRecord();
  }

  const parsed = JSON.parse(storedValue) as Partial<DivinityProgressRecord>;

  return {
    startLevel: parsed.startLevel ?? 1,
    endLevel: parsed.endLevel ?? 30,
    currentLevel: parsed.currentLevel ?? 1,
    filledSegments: parsed.filledSegments ?? 0,
    updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function saveDivinityProgress(
  progress: Pick<
    DivinityProgressRecord,
    "startLevel" | "endLevel" | "currentLevel" | "filledSegments"
  >,
): Promise<DivinityProgressRecord> {
  const record: DivinityProgressRecord = {
    startLevel: progress.startLevel,
    endLevel: progress.endLevel,
    currentLevel: progress.currentLevel,
    filledSegments: progress.filledSegments,
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
