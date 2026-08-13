import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  parseHeroBuildSnapshot,
  sha256Hex,
  type HeroBuildSnapshotFiles,
  type ParsedHeroBuildSnapshot,
} from "../data/heroBuildSnapshot";

const POINTER_KEY = "hero-build-snapshot:lkg:current";
const GENERATION_PREFIX = "hero-build-snapshot:lkg:g:";

export type SnapshotKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

let saveQueue = Promise.resolve();

export async function loadLastKnownGoodHeroBuildSnapshot(
  storage: SnapshotKeyValueStorage = AsyncStorage,
): Promise<ParsedHeroBuildSnapshot | null> {
  try {
    const generation = await storage.getItem(POINTER_KEY);
    if (!generation || !generation.startsWith(GENERATION_PREFIX)) {
      return null;
    }
    const [manifestJson, resourceJson] = await Promise.all([
      storage.getItem(`${generation}:manifest`),
      storage.getItem(`${generation}:resource`),
    ]);
    if (!manifestJson || !resourceJson) {
      return null;
    }
    return parseHeroBuildSnapshot(manifestJson, resourceJson);
  } catch {
    return null;
  }
}

export function saveLastKnownGoodHeroBuildSnapshot(
  files: HeroBuildSnapshotFiles,
  storage: SnapshotKeyValueStorage = AsyncStorage,
): Promise<boolean> {
  const operation = saveQueue.then(async () => {
    const incoming = parseHeroBuildSnapshot(files.manifestJson, files.resourceJson);
    const current = await loadLastKnownGoodHeroBuildSnapshot(storage);
    if (
      current &&
      incoming.manifest.contentUpdatedAt < current.manifest.contentUpdatedAt
    ) {
      return false;
    }
    const generation = `${GENERATION_PREFIX}${sha256Hex(files.manifestJson)}`;
    await storage.setItem(`${generation}:resource`, files.resourceJson);
    await storage.setItem(`${generation}:manifest`, files.manifestJson);
    const storedManifest = await storage.getItem(`${generation}:manifest`);
    const storedResource = await storage.getItem(`${generation}:resource`);
    if (!storedManifest || !storedResource) {
      throw new Error("Hero build snapshot generation is incomplete");
    }
    parseHeroBuildSnapshot(storedManifest, storedResource);
    const currentBeforeSwap = await loadLastKnownGoodHeroBuildSnapshot(storage);
    if (
      currentBeforeSwap &&
      incoming.manifest.contentUpdatedAt < currentBeforeSwap.manifest.contentUpdatedAt
    ) {
      return false;
    }
    await storage.setItem(POINTER_KEY, generation);
    return true;
  });
  saveQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
