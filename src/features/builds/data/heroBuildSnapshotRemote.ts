import type { SupabaseConfig } from "@/shared/lib/supabaseConfig";
import type { DataBootstrapManifest } from "./dataBootstrap";
import type { HeroBuildSet } from "@/features/game-data/builds/types";

import {
  createHeroBuildSnapshot,
  parseHeroBuildSnapshot,
  sha256Hex,
  type HeroBuildSnapshotFiles,
  type ParsedHeroBuildSnapshot,
} from "./heroBuildSnapshot";

export const HERO_BUILD_SNAPSHOT_OUTER_BYTES = 4 * 1024 * 1024;
export const HERO_BUILD_SNAPSHOT_INNER_BYTES = 1_572_864;
const MAX_REMOTE_HERO_BUILDS = 1_000;
export const HERO_BUILD_SNAPSHOT_TIMEOUT_MS = 8_000;

type SnapshotResponse = {
  body?: ReadableStream<Uint8Array> | null;
  headers: { get(name: string): string | null };
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type SnapshotFetch = (
  input: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
    signal: AbortSignal;
  },
) => Promise<SnapshotResponse>;

export type RemoteHeroBuildSnapshot = {
  files: HeroBuildSnapshotFiles;
  parsed: ParsedHeroBuildSnapshot;
};

export class HeroBuildSnapshotRemoteError extends Error {
  constructor(
    readonly kind: "timeout",
    message: string,
  ) {
    super(message);
    this.name = "HeroBuildSnapshotRemoteError";
  }
}

export function isHeroBuildSnapshotRemoteTimeoutError(
  error: unknown,
): boolean {
  return (
    error instanceof HeroBuildSnapshotRemoteError && error.kind === "timeout"
  );
}

export async function loadRemoteHeroBuildSnapshot(options: {
  config: SupabaseConfig;
  fetchImpl?: SnapshotFetch;
  manifest: DataBootstrapManifest;
  timeoutMs?: number;
}): Promise<RemoteHeroBuildSnapshot> {
  const {
    config,
    fetchImpl = globalThis.fetch as SnapshotFetch,
    manifest,
    timeoutMs = HERO_BUILD_SNAPSHOT_TIMEOUT_MS,
  } = options;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new HeroBuildSnapshotRemoteError(
            "timeout",
            "Hero build snapshot request timed out",
          ),
        );
      }, timeoutMs);
    });
    const request = async () => {
      const response = await fetchImpl(
        `${config.url.replace(/\/+$/, "")}/rest/v1/rpc/get_published_hero_builds_snapshot`,
        {
          body: "{}",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${config.anonKey}`,
            "Content-Type": "application/json",
            apikey: config.anonKey,
          },
          method: "POST",
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`Hero build snapshot request failed with HTTP ${response.status}`);
      }
      return parseRemoteResponse(await readBoundedText(response), manifest);
    };
    return await Promise.race([request(), timeout]);
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

function parseRemoteResponse(
  text: string,
  manifest: DataBootstrapManifest,
): RemoteHeroBuildSnapshot {
  const value = JSON.parse(text) as unknown;
  if (!Array.isArray(value) || value.length !== 1) {
    throw new Error("Remote hero build snapshot must contain one row");
  }
  const row = readExactObject(value[0], [
    "content_updated_at",
    "etag",
    "hero_builds_text",
    "published_count",
    "resource_checksum",
    "version",
  ]);
  if (
    row.content_updated_at !== manifest.contentUpdatedAt ||
    row.version !== manifest.contentVersion ||
    row.etag !== manifest.resources.heroBuilds.etag
  ) {
    throw new Error("Remote hero build snapshot does not match bootstrap metadata");
  }
  if (
    !Number.isSafeInteger(row.published_count) ||
    (row.published_count as number) < 0 ||
    (row.published_count as number) > MAX_REMOTE_HERO_BUILDS ||
    typeof row.hero_builds_text !== "string" ||
    new TextEncoder().encode(row.hero_builds_text).byteLength > HERO_BUILD_SNAPSHOT_INNER_BYTES ||
    typeof row.resource_checksum !== "string" ||
    row.resource_checksum !== `sha256:${sha256Hex(row.hero_builds_text)}`
  ) {
    throw new Error("Remote hero build snapshot is partial or oversized");
  }
  const heroBuildsValue = JSON.parse(row.hero_builds_text) as unknown;
  if (
    !Array.isArray(heroBuildsValue) ||
    heroBuildsValue.length !== row.published_count
  ) {
    throw new Error("Remote hero build snapshot count is invalid");
  }
  const heroBuilds = heroBuildsValue.map((value) => {
    const entry = readExactObject(value, ["hero_id", "payload"]);
    if (typeof entry.hero_id !== "string") {
      throw new Error("Remote hero build id is invalid");
    }
    return { buildSet: entry.payload as HeroBuildSet, heroId: entry.hero_id };
  });
  const files = createHeroBuildSnapshot({
    contentUpdatedAt: manifest.contentUpdatedAt,
    contentVersion: manifest.contentVersion,
    heroBuilds,
  });
  return { files, parsed: parseHeroBuildSnapshot(files.manifestJson, files.resourceJson) };
}

async function readBoundedText(response: SnapshotResponse): Promise<string> {
  if (!response.body) {
    const length = response.headers.get("Content-Length");
    if (!length || !/^\d+$/.test(length) || Number(length) > HERO_BUILD_SNAPSHOT_OUTER_BYTES) {
      throw new Error("Remote hero build snapshot requires a bounded Content-Length");
    }
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength !== Number(length)) {
      throw new Error("Remote hero build snapshot length is invalid");
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > HERO_BUILD_SNAPSHOT_OUTER_BYTES) {
        try { await reader.cancel("snapshot byte budget exceeded"); } catch {}
        throw new Error("Remote hero build snapshot exceeds its byte budget");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

function readExactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Remote hero build snapshot row is invalid");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) {
    throw new Error("Remote hero build snapshot fields are invalid");
  }
  return keys.reduce<Record<string, unknown>>((result, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw new Error("Remote snapshot accessor is invalid");
    result[key] = descriptor.value;
    return result;
  }, {});
}
