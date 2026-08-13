import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";

import {
  createHeroBuildSnapshot,
  parseHeroBuildSnapshot,
} from "../heroBuildSnapshot";

const mockReadSupabaseConfig = jest.fn();
const mockLoadRemoteHeroBuildSnapshot = jest.fn();
const mockSaveLastKnownGoodHeroBuildSnapshot = jest.fn();

jest.mock("@/shared/lib/supabaseConfig", () => ({
  readSupabaseConfig: () => mockReadSupabaseConfig(),
}));
jest.mock("../heroBuildSnapshotRemote", () => ({
  loadRemoteHeroBuildSnapshot: (...args: unknown[]) =>
    mockLoadRemoteHeroBuildSnapshot(...args),
}));
jest.mock("../../storage/heroBuildSnapshotStorage", () => ({
  loadLastKnownGoodHeroBuildSnapshot: jest.fn(async () => null),
  saveLastKnownGoodHeroBuildSnapshot: (...args: unknown[]) =>
    mockSaveLastKnownGoodHeroBuildSnapshot(...args),
}));

import { loadAndCacheRemoteHeroBuildSnapshot } from "../heroBuildSnapshotSource";

const files = createHeroBuildSnapshot({
  contentUpdatedAt: "2026-06-22T18:10:50.213000Z",
  contentVersion: "hero-builds:aaaaaaaaaaaaaaaa",
  heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
});
const manifest = {
  contentUpdatedAt: "2026-06-22T18:10:50.213000Z",
  contentVersion: "hero-builds:aaaaaaaaaaaaaaaa",
  resources: {
    heroBuilds: {
      etag: `sha256:${"a".repeat(64)}`,
      version: "hero-builds:aaaaaaaaaaaaaaaa",
    },
  },
  schemaVersion: 1 as const,
  status: "ok" as const,
};

beforeEach(() => {
  mockReadSupabaseConfig.mockReturnValue({
    anonKey: "secret",
    url: "https://example.supabase.co",
  });
  mockLoadRemoteHeroBuildSnapshot.mockReset();
  mockLoadRemoteHeroBuildSnapshot.mockResolvedValue({
    files,
    parsed: parseHeroBuildSnapshot(files.manifestJson, files.resourceJson),
  });
  mockSaveLastKnownGoodHeroBuildSnapshot.mockReset();
});

test("observes a detached persistence rejection without rejecting remote", async () => {
  mockSaveLastKnownGoodHeroBuildSnapshot.mockRejectedValue(
    new Error("storage failed"),
  );

  await expect(
    loadAndCacheRemoteHeroBuildSnapshot(manifest),
  ).resolves.toMatchObject({ source: "remote" });
  await Promise.resolve();
});

test("returns and deduplicates validated remote while persistence remains pending", async () => {
  mockSaveLastKnownGoodHeroBuildSnapshot.mockReturnValue(
    new Promise(() => undefined),
  );

  const first = loadAndCacheRemoteHeroBuildSnapshot(manifest);
  const second = loadAndCacheRemoteHeroBuildSnapshot(manifest);
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);

  expect(mockLoadRemoteHeroBuildSnapshot).toHaveBeenCalledTimes(1);
  await expect(
    loadAndCacheRemoteHeroBuildSnapshot(manifest),
  ).resolves.toMatchObject({ source: "remote" });
  expect(mockLoadRemoteHeroBuildSnapshot).toHaveBeenCalledTimes(2);
});
