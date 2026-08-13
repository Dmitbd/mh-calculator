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
const MAX_GENERATIONS = 32;
const RETAINED_VALID_GENERATIONS = 4;
const MAX_GENERATION_ENVELOPE_BYTES = 8 * 1024 * 1024 + 64 * 1024;

export const HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS = 1_500;

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

type GenerationRead =
  | { snapshot: ParsedHeroBuildSnapshot; status: "valid" }
  | { status: "corrupt" | "unavailable" };

class SnapshotStorageTimeoutError extends Error {}

const saveQueues = new WeakMap<object, Promise<void>>();

export async function loadLastKnownGoodHeroBuildSnapshot(
  storage: SnapshotKeyValueStorage = AsyncStorage,
): Promise<ParsedHeroBuildSnapshot | null> {
  try {
    const maximum = await scanMaximumGeneration(storage);
    if (!maximum) return null;
    await repairPointer(storage, maximum.generation);
    return maximum.snapshot;
  } catch {
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
    const envelope = encodeGeneration(files);

    await boundedStorageOperation(() => storage.setItem(generation, envelope));
    const stored = await readGeneration(storage, generation);
    if (stored.status !== "valid") {
      throw new Error("Hero build snapshot generation is invalid after write");
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
    boundedStorageOperation(() => storage.getAllKeys()),
    boundedStorageOperation(() => storage.getItem(POINTER_KEY)),
  ]);
  const generationKeys = [
    ...new Set(allKeys.filter((key) => GENERATION_PATTERN.test(key))),
  ];
  if (generationKeys.length > MAX_GENERATIONS) {
    throw new Error("Hero build snapshot generation count exceeds its budget");
  }

  const generations = pointer && generationKeys.includes(pointer)
    ? [pointer, ...generationKeys.filter((key) => key !== pointer)]
    : generationKeys;
  const valid: ValidGeneration[] = [];
  const corrupt: string[] = [];
  const reads = await Promise.all(
    generations.map(async (generation) => ({
      generation,
      read: await readGeneration(storage, generation),
    })),
  );
  for (const { generation, read } of reads) {
    if (read.status === "valid") {
      valid.push({ generation, snapshot: read.snapshot });
    } else if (read.status === "corrupt") {
      corrupt.push(generation);
    }
  }
  valid.sort((left, right) => {
    const freshness = compareParsedFreshness(right.snapshot, left.snapshot);
    return freshness || right.generation.localeCompare(left.generation, "en");
  });

  if (storage.removeItem) {
    const removable = [
      ...corrupt,
      ...valid.slice(RETAINED_VALID_GENERATIONS).map(({ generation }) => generation),
    ];
    try {
      await Promise.all(
        removable.map((generation) =>
          boundedStorageOperation(() => storage.removeItem!(generation)),
        ),
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
): Promise<GenerationRead> {
  let envelope: string | null;
  try {
    envelope = await boundedStorageOperation(() =>
      storage.getItem(generation),
    );
  } catch {
    return { status: "unavailable" };
  }
  if (!envelope) return { status: "corrupt" };
  try {
    return { snapshot: parseGeneration(envelope), status: "valid" };
  } catch {
    return { status: "corrupt" };
  }
}

async function repairPointer(
  storage: SnapshotKeyValueStorage,
  generation: string,
): Promise<void> {
  try {
    if (
      (await boundedStorageOperation(() => storage.getItem(POINTER_KEY))) !==
      generation
    ) {
      await boundedStorageOperation(() =>
        storage.setItem(POINTER_KEY, generation),
      );
    }
  } catch {
    // The immutable generation remains authoritative when pointer repair fails.
  }
}

function encodeGeneration(files: HeroBuildSnapshotFiles): string {
  const envelope = JSON.stringify({
    manifestJson: files.manifestJson,
    resourceJson: files.resourceJson,
  });
  ensureEnvelopeBudget(envelope);
  return envelope;
}

function parseGeneration(envelope: string): ParsedHeroBuildSnapshot {
  ensureEnvelopeBudget(envelope);
  const value = JSON.parse(envelope) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Hero build snapshot generation envelope is invalid");
  }
  const keys = Object.keys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("manifestJson") ||
    !keys.includes("resourceJson")
  ) {
    throw new Error("Hero build snapshot generation fields are invalid");
  }
  const { manifestJson, resourceJson } = value as Record<string, unknown>;
  if (typeof manifestJson !== "string" || typeof resourceJson !== "string") {
    throw new Error("Hero build snapshot generation payload is invalid");
  }
  return parseHeroBuildSnapshot(manifestJson, resourceJson);
}

function ensureEnvelopeBudget(envelope: string): void {
  if (new TextEncoder().encode(envelope).byteLength > MAX_GENERATION_ENVELOPE_BYTES) {
    throw new Error("Hero build snapshot generation envelope exceeds its budget");
  }
}

function boundedStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new SnapshotStorageTimeoutError(
          "Hero build snapshot storage operation timed out",
        ),
      );
    }, HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);

    let pending: Promise<T>;
    try {
      pending = operation();
    } catch (error) {
      settled = true;
      clearTimeout(timer);
      reject(error);
      return;
    }
    void pending.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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

function toParsed(
  value: HeroBuildSnapshotFiles | ParsedHeroBuildSnapshot,
): ParsedHeroBuildSnapshot {
  return "manifestJson" in value
    ? parseHeroBuildSnapshot(value.manifestJson, value.resourceJson)
    : value;
}
