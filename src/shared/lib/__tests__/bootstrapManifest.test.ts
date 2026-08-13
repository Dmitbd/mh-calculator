import {
  BOOTSTRAP_MAX_PAGES,
  BOOTSTRAP_PAGE_SIZE,
  BootstrapManifestError,
  createHeroBuildsBootstrapManifest,
  loadPublishedHeroBuildMetadata,
  type PublishedHeroBuildMetadata,
} from "../../../../supabase/functions/bootstrap/manifest";

async function digestSha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function row(index: number): PublishedHeroBuildMetadata {
  return {
    hero_id: `hero-${String(index).padStart(5, "0")}`,
    revision: 1,
    updated_at: "2026-08-13T00:00:00.000Z",
  };
}

describe("bootstrap Edge manifest", () => {
  test("paginates beyond 1000 and a tail mutation changes the etag", async () => {
    const rows = Array.from({ length: 1_205 }, (_, index) => row(index));
    const fetchPage = jest.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    const loaded = await loadPublishedHeroBuildMetadata(fetchPage);
    const first = await createHeroBuildsBootstrapManifest(loaded, digestSha256);
    const changed = await createHeroBuildsBootstrapManifest(
      loaded.map((item, index) =>
        index === loaded.length - 1 ? { ...item, revision: 2 } : item,
      ),
      digestSha256,
    );

    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, BOOTSTRAP_PAGE_SIZE - 1);
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      BOOTSTRAP_PAGE_SIZE,
      BOOTSTRAP_PAGE_SIZE * 2 - 1,
    );
    expect(loaded).toHaveLength(1_205);
    expect(changed.resources.heroBuilds.etag).not.toBe(
      first.resources.heroBuilds.etag,
    );
  });

  test("fails closed on a page error", async () => {
    await expect(
      loadPublishedHeroBuildMetadata(async () => ({
        data: null,
        error: { message: "database unavailable" },
      })),
    ).rejects.toBeInstanceOf(BootstrapManifestError);
  });

  test("fails closed when page ordering makes no unique progress", async () => {
    const fullPage = Array.from({ length: BOOTSTRAP_PAGE_SIZE }, (_, index) =>
      row(index),
    );
    await expect(
      loadPublishedHeroBuildMetadata(async () => ({
        data: fullPage,
        error: null,
      })),
    ).rejects.toBeInstanceOf(BootstrapManifestError);
  });

  test("fails closed at the total page budget instead of hashing a partial manifest", async () => {
    await expect(
      loadPublishedHeroBuildMetadata(async (from) => ({
        data: Array.from({ length: BOOTSTRAP_PAGE_SIZE }, (_, index) =>
          row(from + index),
        ),
        error: null,
      })),
    ).rejects.toMatchObject({
      message: expect.stringContaining(String(BOOTSTRAP_MAX_PAGES)),
    });
  });
});
