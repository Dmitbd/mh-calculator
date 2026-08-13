export const BOOTSTRAP_PAGE_SIZE = 500;
export const BOOTSTRAP_MAX_PAGES = 20;

const MAX_HERO_ID_LENGTH = 128;
const MAX_UPDATED_AT_LENGTH = 64;

export type PublishedHeroBuildMetadata = {
  hero_id: string;
  revision: number;
  updated_at: string;
};

export type BootstrapPageResult = {
  data: unknown;
  error: unknown;
};

export type BootstrapPageFetcher = (
  from: number,
  to: number,
) => Promise<BootstrapPageResult>;

export type BootstrapDigest = (value: string) => Promise<string>;

export class BootstrapManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapManifestError";
  }
}

export async function loadPublishedHeroBuildMetadata(
  fetchPage: BootstrapPageFetcher,
): Promise<PublishedHeroBuildMetadata[]> {
  const result: PublishedHeroBuildMetadata[] = [];
  let previousHeroId: string | null = null;

  for (let pageIndex = 0; pageIndex < BOOTSTRAP_MAX_PAGES; pageIndex += 1) {
    const from = pageIndex * BOOTSTRAP_PAGE_SIZE;
    const { data, error } = await fetchPage(
      from,
      from + BOOTSTRAP_PAGE_SIZE - 1,
    );
    if (error !== null && error !== undefined) {
      throw new BootstrapManifestError("Published hero metadata query failed.");
    }
    if (!Array.isArray(data) || data.length > BOOTSTRAP_PAGE_SIZE) {
      throw new BootstrapManifestError("Published hero metadata page is invalid.");
    }

    for (const value of data) {
      const item = parseMetadataRow(value);
      if (previousHeroId !== null && item.hero_id <= previousHeroId) {
        throw new BootstrapManifestError(
          "Published hero metadata pagination made no unique ordered progress.",
        );
      }
      result.push(item);
      previousHeroId = item.hero_id;
    }

    if (data.length < BOOTSTRAP_PAGE_SIZE) {
      return result;
    }
  }

  throw new BootstrapManifestError(
    `Published hero metadata exceeded ${BOOTSTRAP_MAX_PAGES} pages.`,
  );
}

export async function createHeroBuildsBootstrapManifest(
  rows: readonly PublishedHeroBuildMetadata[],
  digest: BootstrapDigest = digestSha256,
) {
  const canonicalRows = rows.map((row) => ({
    heroId: row.hero_id,
    revision: row.revision,
    updatedAt: row.updated_at,
  }));
  const hash = await digest(JSON.stringify(canonicalRows));
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new BootstrapManifestError("Bootstrap digest is invalid.");
  }
  const etag = `sha256:${hash}`;
  const version = `hero-builds:${hash.slice(0, 16)}`;

  return {
    status: "ok" as const,
    contentVersion: version,
    schemaVersion: 1 as const,
    resources: {
      heroBuilds: { version, etag },
    },
  };
}

function parseMetadataRow(value: unknown): PublishedHeroBuildMetadata {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BootstrapManifestError("Published hero metadata row is invalid.");
  }
  const heroId = readOwnDataProperty(value, "hero_id");
  const revision = readOwnDataProperty(value, "revision");
  const updatedAt = readOwnDataProperty(value, "updated_at");
  if (
    typeof heroId !== "string" ||
    heroId.length === 0 ||
    heroId.length > MAX_HERO_ID_LENGTH ||
    heroId.trim() !== heroId
  ) {
    throw new BootstrapManifestError("Published hero id is invalid.");
  }
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) {
    throw new BootstrapManifestError("Published hero revision is invalid.");
  }
  if (
    typeof updatedAt !== "string" ||
    updatedAt.length === 0 ||
    updatedAt.length > MAX_UPDATED_AT_LENGTH
  ) {
    throw new BootstrapManifestError("Published hero updated_at is invalid.");
  }
  return {
    hero_id: heroId,
    revision: revision as number,
    updated_at: updatedAt,
  };
}

function readOwnDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor)) {
    throw new BootstrapManifestError(
      `Published hero metadata ${key} must be an own data property.`,
    );
  }
  return descriptor.value;
}

async function digestSha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
