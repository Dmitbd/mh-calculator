import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";

import {
  createHeroBuildSnapshot,
  sha256Hex,
  type HeroBuildSnapshotFiles,
} from "../../data/heroBuildSnapshot";
import {
  compareHeroBuildSnapshotFreshness,
  HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS,
  loadLastKnownGoodHeroBuildSnapshot,
  saveLastKnownGoodHeroBuildSnapshot,
  type SnapshotKeyValueStorage,
} from "../heroBuildSnapshotStorage";

const POINTER_KEY = "hero-build-snapshot:lkg:current";
const older = snapshot("2026-06-01T00:00:00.000000Z", "hero-builds:older");
const newer = snapshot("2026-06-02T00:00:00.000000Z", "hero-builds:newer");

function snapshot(contentUpdatedAt: string, contentVersion: string) {
  return createHeroBuildSnapshot({
    contentUpdatedAt,
    contentVersion,
    heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
  });
}

function generationKey(files: HeroBuildSnapshotFiles) {
  return `hero-build-snapshot:lkg:g:${sha256Hex(files.manifestJson)}`;
}

function generationEnvelope(files: HeroBuildSnapshotFiles) {
  return JSON.stringify({
    manifestJson: files.manifestJson,
    resourceJson: files.resourceJson,
  });
}

function createMemoryStorage() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const storage: SnapshotKeyValueStorage = {
    getAllKeys: async () => [...values.keys()],
    getItem: async (key) => values.get(key) ?? null,
    removeItem: async (key) => {
      values.delete(key);
    },
    setItem: async (key, value) => {
      writes.push(key);
      values.set(key, value);
    },
  };
  return { storage, values, writes };
}

describe("hero build last-known-good storage", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("atomically writes one exact generation blob before the pointer", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage);

    expect(memory.writes).toEqual([generationKey(newer), POINTER_KEY]);
    expect(Object.keys(JSON.parse(memory.values.get(generationKey(newer))!))).toEqual([
      "manifestJson",
      "resourceJson",
    ]);
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
  });

  test("an interrupted atomic generation write leaves no key and preserves current", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(older, memory.storage);
    const interrupted: SnapshotKeyValueStorage = {
      ...memory.storage,
      setItem: async (key, value) => {
        if (key === generationKey(newer)) throw new Error("interrupted");
        await memory.storage.setItem(key, value);
      },
    };

    await expect(
      saveLastKnownGoodHeroBuildSnapshot(newer, interrupted),
    ).rejects.toThrow("interrupted");
    expect(memory.values.has(generationKey(newer))).toBe(false);
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
  });

  test("ignores unrelated keys when applying the generation budget", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage);
    for (let index = 0; index < 600; index += 1) {
      memory.values.set(`unrelated:${index}`, "x");
    }
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
  });

  test("scans 40 valid generations, returns the maximum, and retains top four", async () => {
    const memory = createMemoryStorage();
    const generations = Array.from({ length: 40 }, (_, index) => snapshot(
      `2026-06-03T00:00:${String(index).padStart(2, "0")}.000000Z`,
      `hero-builds:${String(index).padStart(2, "0")}`,
    ));
    for (const files of generations) {
      memory.values.set(generationKey(files), generationEnvelope(files));
    }
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:39" },
    });
    expect(
      [...memory.values.keys()].filter((key) => key.startsWith("hero-build-snapshot:lkg:g:")),
    ).toHaveLength(4);
  });

  test("fails closed above 128 exact generation keys", async () => {
    const memory = createMemoryStorage();
    for (let index = 0; index < 129; index += 1) {
      memory.values.set(
        `hero-build-snapshot:lkg:g:${index.toString(16).padStart(64, "0")}`,
        "{}",
      );
    }
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toBeNull();
  });

  test("recovers from but never removes a corrupt complete generation", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(older, memory.storage);
    await saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage);
    memory.values.set(generationKey(newer), "{corrupt");

    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
    expect(memory.values.has(generationKey(newer))).toBe(true);
  });

  test("never lets late corrupt cleanup delete the same generation after repair", async () => {
    jest.useFakeTimers();
    const memory = createMemoryStorage();
    memory.values.set(generationKey(older), generationEnvelope(older));
    memory.values.set(generationKey(newer), "{corrupt");
    let finishRemove: (() => void) | undefined;
    const removeItem = jest.fn((key: string) => new Promise<void>((resolve) => {
      finishRemove = () => {
        memory.values.delete(key);
        resolve();
      };
    }));
    const racingStorage: SnapshotKeyValueStorage = {
      ...memory.storage,
      removeItem,
    };

    const load = loadLastKnownGoodHeroBuildSnapshot(racingStorage);
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await expect(load).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
    expect(removeItem).not.toHaveBeenCalled();

    memory.values.set(generationKey(newer), generationEnvelope(newer));
    finishRemove?.();
    await Promise.resolve();
    expect(memory.values.has(generationKey(newer))).toBe(true);
  });

  test("uses a total deterministic freshness order", () => {
    const equalDateA = snapshot("2026-06-03T00:00:00.000000Z", "hero-builds:a");
    const equalDateZ = snapshot("2026-06-03T00:00:00.000000Z", "hero-builds:z");
    expect(compareHeroBuildSnapshotFreshness(equalDateA, equalDateZ)).toBeLessThan(0);
    expect(compareHeroBuildSnapshotFreshness(equalDateZ, equalDateA)).toBeGreaterThan(0);
  });

  test("independent writers cannot make an older pointer observable", async () => {
    const memory = createMemoryStorage();
    let reachedPointer!: () => void;
    const atPointer = new Promise<void>((resolve) => { reachedPointer = resolve; });
    let releasePointer!: () => void;
    const pointerGate = new Promise<void>((resolve) => { releasePointer = resolve; });
    const olderContext: SnapshotKeyValueStorage = {
      ...memory.storage,
      setItem: async (key, value) => {
        if (key === POINTER_KEY) {
          reachedPointer();
          await pointerGate;
        }
        await memory.storage.setItem(key, value);
      },
    };

    const olderWrite = saveLastKnownGoodHeroBuildSnapshot(older, olderContext);
    await atPointer;
    await saveLastKnownGoodHeroBuildSnapshot(newer, { ...memory.storage });
    releasePointer();
    await olderWrite;

    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
    expect(memory.values.get(POINTER_KEY)).toBe(generationKey(newer));
  });

  test("hung enumeration and reads return null within the storage deadline", async () => {
    jest.useFakeTimers();
    const never = new Promise<never>(() => undefined);
    const hungEnumeration: SnapshotKeyValueStorage = {
      getAllKeys: () => never,
      getItem: async () => null,
      setItem: async () => undefined,
    };
    const enumeration = loadLastKnownGoodHeroBuildSnapshot(hungEnumeration);
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await expect(enumeration).resolves.toBeNull();

    const key = generationKey(newer);
    const hungRead: SnapshotKeyValueStorage = {
      getAllKeys: async () => [key],
      getItem: (requested) => requested === key ? never : Promise.resolve(null),
      setItem: async () => undefined,
    };
    const read = loadLastKnownGoodHeroBuildSnapshot(hungRead);
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await expect(read).resolves.toBeNull();
  });

  test("a timed-out save queue observes the late operation and accepts a later save", async () => {
    jest.useFakeTimers();
    const memory = createMemoryStorage();
    let firstGenerationWrite = true;
    let rejectLateWrite!: (error: Error) => void;
    const recovering: SnapshotKeyValueStorage = {
      ...memory.storage,
      setItem: (key, value) => {
        if (key !== POINTER_KEY && firstGenerationWrite) {
          firstGenerationWrite = false;
          return new Promise((_resolve, reject) => {
            rejectLateWrite = reject;
          });
        }
        return memory.storage.setItem(key, value);
      },
    };

    const timedOut = saveLastKnownGoodHeroBuildSnapshot(older, recovering);
    const timeoutAssertion = expect(timedOut).rejects.toThrow("timed out");
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await timeoutAssertion;
    rejectLateWrite(new Error("late storage rejection"));
    await Promise.resolve();

    await expect(
      saveLastKnownGoodHeroBuildSnapshot(newer, recovering),
    ).resolves.toBe(true);
    await expect(loadLastKnownGoodHeroBuildSnapshot(recovering)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
  });

  test("hung optional cleanup is bounded and cannot hide a valid generation", async () => {
    jest.useFakeTimers();
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(older, memory.storage);
    memory.values.set(
      "hero-build-snapshot:lkg:g:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      "{corrupt",
    );
    const cleanupHung: SnapshotKeyValueStorage = {
      ...memory.storage,
      removeItem: () => new Promise(() => undefined),
    };
    const load = loadLastKnownGoodHeroBuildSnapshot(cleanupHung);
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await expect(load).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
  });

  test("does not clean a generation whose read timed out without proving corruption", async () => {
    jest.useFakeTimers();
    const key = generationKey(newer);
    const removeItem = jest.fn(async () => undefined);
    const unavailable: SnapshotKeyValueStorage = {
      getAllKeys: async () => [key],
      getItem: (requested) => requested === key
        ? new Promise(() => undefined)
        : Promise.resolve(null),
      removeItem,
      setItem: async () => undefined,
    };

    const load = loadLastKnownGoodHeroBuildSnapshot(unavailable);
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await expect(load).resolves.toBeNull();
    expect(removeItem).not.toHaveBeenCalled();
  });

  test("a late timed-out valid-old cleanup cannot remove the top generation", async () => {
    jest.useFakeTimers();
    const memory = createMemoryStorage();
    const generations = Array.from({ length: 5 }, (_, index) => snapshot(
      `2026-06-04T00:00:0${index}.000000Z`,
      `hero-builds:cleanup-${index}`,
    ));
    for (const files of generations) {
      memory.values.set(generationKey(files), generationEnvelope(files));
    }
    let finishRemove!: () => void;
    const cleanupStorage: SnapshotKeyValueStorage = {
      ...memory.storage,
      removeItem: (key) => new Promise<void>((resolve) => {
        finishRemove = () => {
          memory.values.delete(key);
          resolve();
        };
      }),
    };

    const firstLoad = loadLastKnownGoodHeroBuildSnapshot(cleanupStorage);
    await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);
    await expect(firstLoad).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:cleanup-4" },
    });
    finishRemove();
    await Promise.resolve();
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:cleanup-4" },
    });
  });
});
