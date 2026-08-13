import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";

import { createHeroBuildSnapshot } from "../../data/heroBuildSnapshot";
import {
  compareHeroBuildSnapshotFreshness,
  loadLastKnownGoodHeroBuildSnapshot,
  saveLastKnownGoodHeroBuildSnapshot,
  type SnapshotKeyValueStorage,
} from "../heroBuildSnapshotStorage";

const older = createHeroBuildSnapshot({
  contentUpdatedAt: "2026-06-01T00:00:00.000000Z",
  contentVersion: "hero-builds:older",
  heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
});
const newer = createHeroBuildSnapshot({
  contentUpdatedAt: "2026-06-02T00:00:00.000000Z",
  contentVersion: "hero-builds:newer",
  heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
});

function createMemoryStorage(failAtWrite = Number.POSITIVE_INFINITY) {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const storage: SnapshotKeyValueStorage = {
    getItem: async (key) => values.get(key) ?? null,
    getAllKeys: async () => [...values.keys()],
    removeItem: async (key) => {
      values.delete(key);
    },
    setItem: async (key, value) => {
      writes.push(key);
      if (writes.length === failAtWrite) {
        throw new Error("interrupted");
      }
      values.set(key, value);
    },
  };
  return { storage, values, writes };
}

describe("hero build last-known-good storage", () => {
  test("publishes a generation pointer only after both files validate", async () => {
    const memory = createMemoryStorage();

    await saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage);

    expect(memory.writes).toHaveLength(3);
    expect(memory.writes[2]).toBe("hero-build-snapshot:lkg:current");
    await expect(
      loadLastKnownGoodHeroBuildSnapshot(memory.storage),
    ).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
  });

  test("an interrupted generation never replaces the current generation", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(older, memory.storage);
    const pointerBefore = memory.values.get("hero-build-snapshot:lkg:current");

    const interruptedStorage: SnapshotKeyValueStorage = {
      getItem: memory.storage.getItem,
      getAllKeys: memory.storage.getAllKeys,
      removeItem: memory.storage.removeItem,
      setItem: async (key, value) => {
        if (key.endsWith(":resource")) {
          throw new Error("interrupted");
        }
        await memory.storage.setItem(key, value);
      },
    };
    await expect(
      saveLastKnownGoodHeroBuildSnapshot(newer, interruptedStorage),
    ).rejects.toThrow("interrupted");

    expect(memory.values.get("hero-build-snapshot:lkg:current")).toBe(
      pointerBefore,
    );
    await expect(
      loadLastKnownGoodHeroBuildSnapshot(memory.storage),
    ).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
  });

  test("rejects older and corrupt generations without poisoning current", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(older, memory.storage);
    await saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage);

    await expect(
      saveLastKnownGoodHeroBuildSnapshot(older, memory.storage),
    ).resolves.toBe(false);
    await expect(
      loadLastKnownGoodHeroBuildSnapshot(memory.storage),
    ).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });

    const pointer = memory.values.get("hero-build-snapshot:lkg:current")!;
    memory.values.set(`${pointer}:resource`, "{corrupt");
    await expect(
      loadLastKnownGoodHeroBuildSnapshot(memory.storage),
    ).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
  });

  test("returns the best valid generation when optional cleanup fails", async () => {
    const memory = createMemoryStorage();
    await saveLastKnownGoodHeroBuildSnapshot(older, memory.storage);
    await saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage);
    const pointer = memory.values.get("hero-build-snapshot:lkg:current")!;
    memory.values.set(`${pointer}:resource`, "{corrupt");

    const cleanupFailingStorage: SnapshotKeyValueStorage = {
      ...memory.storage,
      removeItem: async () => {
        throw new Error("cleanup unavailable");
      },
    };

    await expect(
      loadLastKnownGoodHeroBuildSnapshot(cleanupFailingStorage),
    ).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:older" },
    });
  });

  test("serializes concurrent saves so an older completion cannot downgrade the pointer", async () => {
    const memory = createMemoryStorage();
    await Promise.all([
      saveLastKnownGoodHeroBuildSnapshot(newer, memory.storage),
      saveLastKnownGoodHeroBuildSnapshot(older, memory.storage),
    ]);
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
  });

  test("uses a total deterministic freshness order for equal backend dates", () => {
    const equalDateA = createHeroBuildSnapshot({
      contentUpdatedAt: "2026-06-03T00:00:00.000000Z",
      contentVersion: "hero-builds:a",
      heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
    });
    const equalDateZ = createHeroBuildSnapshot({
      contentUpdatedAt: "2026-06-03T00:00:00.000000Z",
      contentVersion: "hero-builds:z",
      heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
    });
    expect(compareHeroBuildSnapshotFreshness(equalDateA, equalDateZ)).toBeLessThan(0);
    expect(compareHeroBuildSnapshotFreshness(equalDateZ, equalDateA)).toBeGreaterThan(0);
  });

  test("recovers the maximum generation after two independent writers race pointers", async () => {
    const memory = createMemoryStorage();
    let reachedOlderPointer!: () => void;
    const olderAtPointer = new Promise<void>((resolve) => { reachedOlderPointer = resolve; });
    let releaseOlderPointer!: () => void;
    const olderPointerGate = new Promise<void>((resolve) => { releaseOlderPointer = resolve; });
    const olderContext: SnapshotKeyValueStorage = {
      ...memory.storage,
      setItem: async (key, value) => {
        if (key === "hero-build-snapshot:lkg:current") {
          reachedOlderPointer();
          await olderPointerGate;
        }
        await memory.storage.setItem(key, value);
      },
    };
    const newerContext: SnapshotKeyValueStorage = { ...memory.storage };

    const olderWrite = saveLastKnownGoodHeroBuildSnapshot(older, olderContext);
    await olderAtPointer;
    await saveLastKnownGoodHeroBuildSnapshot(newer, newerContext);
    releaseOlderPointer();
    await olderWrite;

    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toMatchObject({
      manifest: { contentVersion: "hero-builds:newer" },
    });
    const repairedPointer = memory.values.get("hero-build-snapshot:lkg:current")!;
    expect(memory.values.get(`${repairedPointer}:manifest`)).toContain("hero-builds:newer");
  });

  test("fails closed when generation enumeration exceeds its bounded candidate budget", async () => {
    const memory = createMemoryStorage();
    for (let index = 0; index < 33; index += 1) {
      memory.values.set(`hero-build-snapshot:lkg:g:${String(index).padStart(64, "0")}:manifest`, "{}");
      memory.values.set(`hero-build-snapshot:lkg:g:${String(index).padStart(64, "0")}:resource`, "{}");
    }
    await expect(loadLastKnownGoodHeroBuildSnapshot(memory.storage)).resolves.toBeNull();
  });
});
