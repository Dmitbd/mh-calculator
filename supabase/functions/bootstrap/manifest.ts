const MAX_PUBLISHED_COUNT = 100_000;
const ETAG_PATTERN = /^sha256:([a-f0-9]{64})$/;

export type BootstrapManifestRpcResult = {
  contentUpdatedAt: string;
  etag: string;
  publishedCount: number;
  version: string;
};

export class BootstrapManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapManifestError";
  }
}

export function parseBootstrapManifestRpcResponse(
  value: unknown,
): BootstrapManifestRpcResult {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new BootstrapManifestError(
      "Bootstrap manifest RPC must return exactly one row.",
    );
  }
  const row = value[0];
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw new BootstrapManifestError("Bootstrap manifest RPC row is invalid.");
  }
  const keys = Reflect.ownKeys(row);
  if (
    keys.length !== 4 ||
    !keys.includes("content_updated_at") ||
    !keys.includes("published_count") ||
    !keys.includes("version") ||
    !keys.includes("etag")
  ) {
    throw new BootstrapManifestError(
      "Bootstrap manifest RPC row has unexpected fields.",
    );
  }

  const publishedCount = readOwnDataProperty(row, "published_count");
  const contentUpdatedAt = readOwnDataProperty(row, "content_updated_at");
  const version = readOwnDataProperty(row, "version");
  const etag = readOwnDataProperty(row, "etag");
  if (
    typeof contentUpdatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(contentUpdatedAt) ||
    Number.isNaN(Date.parse(contentUpdatedAt))
  ) {
    throw new BootstrapManifestError("Bootstrap manifest content date is invalid.");
  }
  if (
    typeof publishedCount !== "number" ||
    !Number.isSafeInteger(publishedCount) ||
    publishedCount < 0 ||
    publishedCount > MAX_PUBLISHED_COUNT
  ) {
    throw new BootstrapManifestError(
      "Bootstrap manifest published count is invalid.",
    );
  }
  if (typeof etag !== "string") {
    throw new BootstrapManifestError("Bootstrap manifest etag is invalid.");
  }
  const etagMatch = ETAG_PATTERN.exec(etag);
  if (
    !etagMatch ||
    typeof version !== "string" ||
    version !== `hero-builds:${etagMatch[1].slice(0, 16)}`
  ) {
    throw new BootstrapManifestError(
      "Bootstrap manifest version is invalid.",
    );
  }

  return { contentUpdatedAt, etag, publishedCount, version };
}

function readOwnDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor)) {
    throw new BootstrapManifestError(
      `Bootstrap manifest ${key} must be an own data property.`,
    );
  }
  return descriptor.value;
}
