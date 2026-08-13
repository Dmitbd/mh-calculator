import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";

import { createHeroBuildSnapshot } from "../../data/heroBuildSnapshot";
import {
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
    ).resolves.toBeNull();
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
});
