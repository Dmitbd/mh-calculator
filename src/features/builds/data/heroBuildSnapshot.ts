import { parseHeroBuildSet } from "@/features/builds/model/heroBuildSetSchema";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

export const HERO_BUILD_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const HERO_BUILD_SNAPSHOT_RESOURCE_FILE = "hero-builds.json" as const;

const MAX_MANIFEST_BYTES = 16 * 1024;
const MAX_RESOURCE_BYTES = 4 * 1024 * 1024;
const MAX_HERO_BUILDS = 1_000;
const MAX_VERSION_LENGTH = 128;
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const CHECKSUM_PATTERN = /^sha256:[a-f0-9]{64}$/;

export type HeroBuildSnapshotEntry = {
  buildSet: HeroBuildSet;
  heroId: string;
};

export type HeroBuildSnapshotManifest = {
  contentUpdatedAt: string;
  contentVersion: string;
  resources: {
    heroBuilds: {
      checksum: string;
      file: typeof HERO_BUILD_SNAPSHOT_RESOURCE_FILE;
    };
  };
  schemaVersion: typeof HERO_BUILD_SNAPSHOT_SCHEMA_VERSION;
};

export type HeroBuildSnapshotFiles = {
  manifestJson: string;
  resourceJson: string;
};

export type ParsedHeroBuildSnapshot = {
  heroBuilds: HeroBuildSnapshotEntry[];
  manifest: HeroBuildSnapshotManifest;
};

export class HeroBuildSnapshotError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HeroBuildSnapshotError";
  }
}

export function createHeroBuildSnapshot(params: {
  contentUpdatedAt: string;
  contentVersion: string;
  heroBuilds: readonly { buildSet: unknown; heroId: string }[];
}): HeroBuildSnapshotFiles {
  validateContentMetadata(params.contentVersion, params.contentUpdatedAt);
  if (params.heroBuilds.length > MAX_HERO_BUILDS) {
    throw new HeroBuildSnapshotError("snapshot heroBuilds exceeds its collection budget");
  }
  const heroBuilds = [...params.heroBuilds]
    .sort((left, right) => left.heroId.localeCompare(right.heroId, "en"))
    .map(({ buildSet, heroId }) => ({
      buildSet: parseHeroBuildSet(buildSet, heroId),
      heroId,
    }));
  validateUniqueIds(heroBuilds);

  const resourceJson = `${canonicalJson({ heroBuilds })}\n`;
  ensureByteBudget(resourceJson, MAX_RESOURCE_BYTES, "resource");
  const manifest: HeroBuildSnapshotManifest = {
    contentUpdatedAt: params.contentUpdatedAt,
    contentVersion: params.contentVersion,
    resources: {
      heroBuilds: {
        checksum: `sha256:${sha256Hex(resourceJson)}`,
        file: HERO_BUILD_SNAPSHOT_RESOURCE_FILE,
      },
    },
    schemaVersion: HERO_BUILD_SNAPSHOT_SCHEMA_VERSION,
  };
  const manifestJson = `${canonicalJson(manifest)}\n`;
  ensureByteBudget(manifestJson, MAX_MANIFEST_BYTES, "manifest");

  return { manifestJson, resourceJson };
}

export function parseHeroBuildSnapshot(
  manifestJson: string,
  resourceJson: string,
): ParsedHeroBuildSnapshot {
  try {
    ensureByteBudget(manifestJson, MAX_MANIFEST_BYTES, "manifest");
    ensureByteBudget(resourceJson, MAX_RESOURCE_BYTES, "resource");
    const manifestValue = JSON.parse(manifestJson) as unknown;
    const manifestRoot = readExactObject(manifestValue, [
      "contentUpdatedAt",
      "contentVersion",
      "resources",
      "schemaVersion",
    ]);
    if (manifestRoot.schemaVersion !== HERO_BUILD_SNAPSHOT_SCHEMA_VERSION) {
      throw new Error("snapshot schemaVersion is incompatible");
    }
    const contentVersion = manifestRoot.contentVersion;
    const contentUpdatedAt = manifestRoot.contentUpdatedAt;
    validateContentMetadata(contentVersion, contentUpdatedAt);
    const resources = readExactObject(manifestRoot.resources, ["heroBuilds"]);
    const heroBuildsResource = readExactObject(resources.heroBuilds, [
      "checksum",
      "file",
    ]);
    if (heroBuildsResource.file !== HERO_BUILD_SNAPSHOT_RESOURCE_FILE) {
      throw new Error("snapshot resource filename is invalid");
    }
    if (
      typeof heroBuildsResource.checksum !== "string" ||
      !CHECKSUM_PATTERN.test(heroBuildsResource.checksum)
    ) {
      throw new Error("snapshot checksum is invalid");
    }
    if (heroBuildsResource.checksum !== `sha256:${sha256Hex(resourceJson)}`) {
      throw new Error("snapshot checksum does not match its resource");
    }

    const resourceRoot = readExactObject(JSON.parse(resourceJson) as unknown, [
      "heroBuilds",
    ]);
    if (
      !Array.isArray(resourceRoot.heroBuilds) ||
      resourceRoot.heroBuilds.length > MAX_HERO_BUILDS
    ) {
      throw new Error("snapshot heroBuilds must be a bounded array");
    }
    const heroBuilds = resourceRoot.heroBuilds.map((entry, index) => {
      const row = readExactObject(entry, ["buildSet", "heroId"]);
      if (
        typeof row.heroId !== "string" ||
        row.heroId.length > 64 ||
        !STABLE_ID_PATTERN.test(row.heroId)
      ) {
        throw new Error(`snapshot heroBuilds.${index}.heroId is invalid`);
      }
      return {
        buildSet: parseHeroBuildSet(row.buildSet, row.heroId),
        heroId: row.heroId,
      };
    });
    validateUniqueIds(heroBuilds);

    return {
      heroBuilds,
      manifest: {
        contentUpdatedAt: contentUpdatedAt as string,
        contentVersion,
        resources: {
          heroBuilds: {
            checksum: heroBuildsResource.checksum,
            file: HERO_BUILD_SNAPSHOT_RESOURCE_FILE,
          },
        },
        schemaVersion: HERO_BUILD_SNAPSHOT_SCHEMA_VERSION,
      },
    };
  } catch (error) {
    if (error instanceof HeroBuildSnapshotError) {
      throw error;
    }
    throw new HeroBuildSnapshotError(
      error instanceof Error ? error.message : "Hero build snapshot is invalid",
      { cause: error },
    );
  }
}

export function sha256Hex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const words = new Uint32Array(64);
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const constants = SHA256_CONSTANTS;
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const before15 = words[index - 15];
      const before2 = words[index - 2];
      const sigma0 = rotateRight(before15, 7) ^ rotateRight(before15, 18) ^ (before15 >>> 3);
      const sigma1 = rotateRight(before2, 17) ^ rotateRight(before2, 19) ^ (before2 >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return Array.from(hash, (word) => word.toString(16).padStart(8, "0")).join("");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const json = JSON.stringify(value);
    if (json === undefined) {
      throw new HeroBuildSnapshotError("snapshot contains a non-JSON value");
    }
    return json;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function validateContentMetadata(
  contentVersion: unknown,
  contentUpdatedAt: unknown,
): asserts contentVersion is string {
  if (
    typeof contentVersion !== "string" ||
    contentVersion.length === 0 ||
    contentVersion.length > MAX_VERSION_LENGTH ||
    contentVersion.trim() !== contentVersion
  ) {
    throw new HeroBuildSnapshotError("snapshot contentVersion is invalid");
  }
  if (
    typeof contentUpdatedAt !== "string" ||
    !CONTENT_DATE_PATTERN.test(contentUpdatedAt) ||
    Number.isNaN(Date.parse(contentUpdatedAt))
  ) {
    throw new HeroBuildSnapshotError("snapshot contentUpdatedAt is invalid");
  }
}

function validateUniqueIds(entries: readonly HeroBuildSnapshotEntry[]): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.heroId)) {
      throw new HeroBuildSnapshotError(`duplicate hero id ${entry.heroId}`);
    }
    ids.add(entry.heroId);
  }
}

function readExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("snapshot field must be a plain object");
  }
  const prototype = Object.getPrototypeOf(value);
  const keys = Reflect.ownKeys(value);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.length !== expectedKeys.length ||
    keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("snapshot object fields do not match the contract");
  }
  const result: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new Error(`snapshot ${key} must be an own data property`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function ensureByteBudget(value: string, maximum: number, name: string): void {
  if (new TextEncoder().encode(value).byteLength > maximum) {
    throw new HeroBuildSnapshotError(`snapshot ${name} exceeds its byte budget`);
  }
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

const SHA256_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
