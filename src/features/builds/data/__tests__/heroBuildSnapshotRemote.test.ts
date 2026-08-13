import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";
import type { DataBootstrapManifest } from "@/shared/lib/dataBootstrap";

import { sha256Hex } from "../heroBuildSnapshot";
import {
  HERO_BUILD_SNAPSHOT_INNER_BYTES,
  HERO_BUILD_SNAPSHOT_OUTER_BYTES,
  HeroBuildSnapshotRemoteError,
  loadRemoteHeroBuildSnapshot,
} from "../heroBuildSnapshotRemote";

const etag = `sha256:${"a".repeat(64)}`;
const manifest: DataBootstrapManifest = {
  contentUpdatedAt: "2026-06-22T18:10:50.213000Z",
  contentVersion: "hero-builds:aaaaaaaaaaaaaaaa",
  resources: { heroBuilds: { etag, version: "hero-builds:aaaaaaaaaaaaaaaa" } },
  schemaVersion: 1,
  status: "ok",
};

function responseFor(value: unknown) {
  const text = JSON.stringify(value);
  return {
    body: null,
    headers: { get: () => String(new TextEncoder().encode(text).byteLength) },
    ok: true,
    status: 200,
    text: async () => text,
  };
}

function rpcSnapshotRow(overrides: Record<string, unknown> = {}) {
  const heroBuildsText = JSON.stringify([{ hero_id: "bastet", payload: bastetBuild }]);
  return {
    content_updated_at: manifest.contentUpdatedAt,
    etag,
    hero_builds_text: heroBuildsText,
    published_count: 1,
    resource_checksum: `sha256:${sha256Hex(heroBuildsText)}`,
    version: manifest.contentVersion,
    ...overrides,
  };
}

describe("remote hero build snapshot", () => {
  test("keeps a worst-case escaped inner payload within the outer envelope budget", () => {
    const escaped = "\\".repeat(HERO_BUILD_SNAPSHOT_INNER_BYTES);
    const envelope = JSON.stringify([rpcSnapshotRow({
      hero_builds_text: escaped,
      resource_checksum: `sha256:${sha256Hex(escaped)}`,
    })]);
    expect(new TextEncoder().encode(envelope).byteLength).toBeLessThanOrEqual(
      HERO_BUILD_SNAPSHOT_OUTER_BYTES,
    );
  });
  test("accepts only a complete resource matching bootstrap metadata", async () => {
    const fetchImpl = jest.fn(async () => responseFor([rpcSnapshotRow()]));

    const result = await loadRemoteHeroBuildSnapshot({
      config: { anonKey: "secret", url: "https://example.supabase.co" },
      fetchImpl,
      manifest,
    });

    expect(result.parsed.heroBuilds.map(({ heroId }) => heroId)).toEqual(["bastet"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/get_published_hero_builds_snapshot",
      expect.objectContaining({ method: "POST", signal: expect.any(Object) }),
    );
  });

  test.each([
    ["partial count", { published_count: 2 }],
    ["wrong version", { version: "hero-builds:bbbbbbbbbbbbbbbb" }],
    ["wrong date", { content_updated_at: "2026-06-21T00:00:00.000000Z" }],
    ["wrong metadata checksum", { etag: `sha256:${"b".repeat(64)}` }],
    ["wrong resource checksum", { resource_checksum: `sha256:${"b".repeat(64)}` }],
  ])("rejects %s without returning a promotable generation", async (_label, override) => {
    await expect(loadRemoteHeroBuildSnapshot({
      config: { anonKey: "secret", url: "https://example.supabase.co" },
      fetchImpl: async () => responseFor([rpcSnapshotRow(override)]),
      manifest,
    })).rejects.toThrow();
  });

  test("cancels an oversized chunked body before JSON parsing", async () => {
    const cancel = jest.fn(async () => undefined);
    const reader = {
      cancel,
      read: jest.fn(async () => ({ done: false, value: new Uint8Array(4 * 1024 * 1024 + 1) })),
      releaseLock: jest.fn(),
    };
    await expect(loadRemoteHeroBuildSnapshot({
      config: { anonKey: "secret", url: "https://example.supabase.co" },
      fetchImpl: async () => ({
        body: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
        headers: { get: () => null }, ok: true, status: 200, text: async () => "",
      }),
      manifest,
    })).rejects.toThrow("budget");
    expect(cancel).toHaveBeenCalled();
  });

  test("aborts the sole full-resource request and classifies its internal deadline", async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const request = loadRemoteHeroBuildSnapshot({
      config: { anonKey: "secret", url: "https://example.supabase.co" },
      fetchImpl: (_input, init) => {
        signal = init.signal;
        return new Promise(() => undefined);
      },
      manifest,
      timeoutMs: 10,
    });
    const rejection = expect(request).rejects.toEqual(
      expect.objectContaining<Partial<HeroBuildSnapshotRemoteError>>({
        kind: "timeout",
      }),
    );

    await jest.advanceTimersByTimeAsync(10);
    await rejection;
    expect(signal?.aborted).toBe(true);
    jest.useRealTimers();
  });
});
