import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  parseHeroBuildSnapshot,
  sha256Hex,
  type HeroBuildSnapshotFiles,
  type ParsedHeroBuildSnapshot,
} from "../data/heroBuildSnapshot";

const POINTER_KEY = "hero-build-snapshot:lkg:current";
const GENERATION_PREFIX = "hero-build-snapshot:lkg:g:";
const GENERATION_PATTERN = /^hero-build-snapshot:lkg:g:[a-f0-9]{64}$/;
const MAX_ENUMERATED_KEYS = 512;
const MAX_GENERATIONS = 32;
const RETAINED_VALID_GENERATIONS = 4;

export type SnapshotKeyValueStorage = {
  getAllKeys(): Promise<readonly string[]>;
  getItem(key: string): Promise<string | null>;
  removeItem?(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
};

type ValidGeneration = {
  generation: string;
  snapshot: ParsedHeroBuildSnapshot;
};

const saveQueues = new WeakMap<object, Promise<void>>();

export async function loadLastKnownGoodHeroBuildSnapshot(
  storage: SnapshotKeyValueStorage = AsyncStorage,
): Promise<ParsedHeroBuildSnapshot | null> {
  try {
    const maximum = await scanMaximumGeneration(storage);
    if (!maximum) {
      return null;
    }
    await repairPointer(storage, maximum.generation);
    return maximum.snapshot;
  } catch {
    // Enumeration overflow or adapter failure fails closed to bundled data.
    return null;
  }
}

export function saveLastKnownGoodHeroBuildSnapshot(
  files: HeroBuildSnapshotFiles,
  storage: SnapshotKeyValueStorage = AsyncStorage,
): Promise<boolean> {
  const previous = saveQueues.get(storage) ?? Promise.resolve();
  const operation = previous.then(async () => {
    const incoming = parseHeroBuildSnapshot(
      files.manifestJson,
      files.resourceJson,
    );
    const generation = `${GENERATION_PREFIX}${sha256Hex(files.manifestJson)}`;
    await storage.setItem(`${generation}:resource`, files.resourceJson);
    await storage.setItem(`${generation}:manifest`, files.manifestJson);

    const stored = await readGeneration(storage, generation);
    if (!stored) {
      throw new Error("Hero build snapshot generation is incomplete");
    }

    const maximum = await scanMaximumGeneration(storage);
    if (!maximum) {
      throw new Error("Hero build snapshot generation scan is empty");
    }
    await repairPointer(storage, maximum.generation);
    return compareParsedFreshness(incoming, maximum.snapshot) === 0;
  });
  saveQueues.set(storage, operation.then(() => undefined, () => undefined));
  return operation;
}

export function compareHeroBuildSnapshotFreshness(
  left: HeroBuildSnapshotFiles | ParsedHeroBuildSnapshot,
  right: HeroBuildSnapshotFiles | ParsedHeroBuildSnapshot,
): number {
  return compareParsedFreshness(toParsed(left), toParsed(right));
}

async function scanMaximumGeneration(
  storage: SnapshotKeyValueStorage,
): Promise<ValidGeneration | null> {
  const [allKeys, pointer] = await Promise.all([
    storage.getAllKeys(),
    storage.getItem(POINTER_KEY),
  ]);
  if (allKeys.length > MAX_ENUMERATED_KEYS) {
    throw new Error("Hero build snapshot key enumeration exceeds its budget");
  }

  const generations = new Set<string>();
  if (pointer && GENERATION_PATTERN.test(pointer)) {
    generations.add(pointer);
  }
  for (const key of allKeys) {
    const generation = getGenerationFromKey(key);
    if (generation) {
      generations.add(generation);
    }
  }
  if (generations.size > MAX_GENERATIONS) {
    throw new Error("Hero build snapshot generation count exceeds its budget");
  }

  const valid: ValidGeneration[] = [];
  const invalid: string[] = [];
  for (const generation of generations) {
    const snapshot = await readGeneration(storage, generation);
    if (snapshot) {
      valid.push({ generation, snapshot });
    } else {
      invalid.push(generation);
    }
  }
  valid.sort((left, right) => {
    const freshness = compareParsedFreshness(right.snapshot, left.snapshot);
    return freshness || right.generation.localeCompare(left.generation, "en");
  });

  if (storage.removeItem) {
    const removable = [
      ...invalid,
      ...valid.slice(RETAINED_VALID_GENERATIONS).map(({ generation }) => generation),
    ];
    try {
      await Promise.all(
        removable.flatMap((generation) => [
          storage.removeItem!(`${generation}:manifest`),
          storage.removeItem!(`${generation}:resource`),
        ]),
      );
    } catch {
      // Cleanup is best-effort; a valid generation must remain readable.
    }
  }

  return valid[0] ?? null;
}

async function readGeneration(
  storage: SnapshotKeyValueStorage,
  generation: string,
): Promise<ParsedHeroBuildSnapshot | null> {
  try {
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

async function repairPointer(
  storage: SnapshotKeyValueStorage,
  generation: string,
): Promise<void> {
  try {
    if ((await storage.getItem(POINTER_KEY)) !== generation) {
      await storage.setItem(POINTER_KEY, generation);
    }
  } catch {
    // Immutable generations remain authoritative when pointer repair fails.
  }
}

function compareParsedFreshness(
  left: ParsedHeroBuildSnapshot,
  right: ParsedHeroBuildSnapshot,
): number {
  return compareStrings(
    left.manifest.contentUpdatedAt,
    right.manifest.contentUpdatedAt,
  ) || compareStrings(
    left.manifest.contentVersion,
    right.manifest.contentVersion,
  ) || compareStrings(
    left.manifest.resources.heroBuilds.checksum,
    right.manifest.resources.heroBuilds.checksum,
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function getGenerationFromKey(key: string): string | null {
  for (const suffix of [":manifest", ":resource"] as const) {
    if (key.endsWith(suffix)) {
      const generation = key.slice(0, -suffix.length);
      return GENERATION_PATTERN.test(generation) ? generation : null;
    }
  }
  return null;
}

function toParsed(
  value: HeroBuildSnapshotFiles | ParsedHeroBuildSnapshot,
): ParsedHeroBuildSnapshot {
  return "manifestJson" in value
    ? parseHeroBuildSnapshot(value.manifestJson, value.resourceJson)
    : value;
}
