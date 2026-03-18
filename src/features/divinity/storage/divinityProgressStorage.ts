import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "divinity-progress";

export type DivinityProgressRecord = {
  currentLevel: number;
  updatedAt: string;
};

const defaultRecord = (): DivinityProgressRecord => ({
  currentLevel: 0,
  updatedAt: new Date(0).toISOString(),
});

export async function loadDivinityProgress(): Promise<DivinityProgressRecord> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultRecord();
  }

  return JSON.parse(storedValue) as DivinityProgressRecord;
}

export async function saveDivinityProgress(
  progress: Pick<DivinityProgressRecord, "currentLevel">,
): Promise<DivinityProgressRecord> {
  const record: DivinityProgressRecord = {
    currentLevel: progress.currentLevel,
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
