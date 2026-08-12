import type { HeroBuildSet } from "@/features/game-data/heroes/types";

import {
  deleteDraftHeroBuildSet,
  fetchHeroBuildSetStatusIds,
  fetchDraftHeroBuildSet,
  deleteHeroBuildSet,
  fetchPublishedHeroBuildSet,
  fetchPublishedHeroIds,
  loadPublishedHeroBuildSet,
  saveHeroBuildSet,
} from "../heroBuildSetRepository";

const buildSet: HeroBuildSet = {
  schemaVersion: 2,
  tabs: [],
};

function createQueryResult(result: unknown) {
  const query: {
    delete: jest.Mock;
    eq: jest.Mock;
    maybeSingle: jest.Mock;
    select: jest.Mock;
    single: jest.Mock;
    then: jest.Mock;
    upsert: jest.Mock;
  } = {} as never;

  query.delete = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.maybeSingle = jest.fn(async () => result);
  query.select = jest.fn(() => query);
  query.single = jest.fn(async () => result);
  query.then = jest.fn((resolve, reject) =>
    Promise.resolve(result).then(resolve, reject),
  );
  query.upsert = jest.fn(() => query);

  return query;
}

describe("heroBuildSetRepository", () => {
  it("fetches draft and published hero ids in one status catalog query", async () => {
    const query = createQueryResult({
      data: [
        { hero_id: "bastet", status: "draft" },
        { hero_id: "morana", status: "published" },
        { hero_id: "bastet", status: "published" },
      ],
      error: null,
    });
    const client = { from: jest.fn(() => query) };

    await expect(fetchHeroBuildSetStatusIds(client)).resolves.toEqual({
      draftHeroIds: ["bastet"],
      publishedHeroIds: ["morana", "bastet"],
    });
    expect(query.select).toHaveBeenCalledWith("hero_id,status");
  });

  it("fetches only the draft build set for a hero", async () => {
    const query = createQueryResult({ data: { payload: buildSet }, error: null });
    const client = { from: jest.fn(() => query) };

    await expect(fetchDraftHeroBuildSet(client, "bastet")).resolves.toEqual(
      buildSet,
    );
    expect(query.select).toHaveBeenCalledWith("payload");
    expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
    expect(query.eq).toHaveBeenCalledWith("status", "draft");
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("deletes only the draft row for one hero", async () => {
    const query = createQueryResult({ data: null, error: null });
    const client = { from: jest.fn(() => query) };

    await deleteDraftHeroBuildSet(client, "bastet");
    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
    expect(query.eq).toHaveBeenCalledWith("status", "draft");
  });

  it("throws when the status catalog cannot be loaded", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });

    await expect(
      fetchHeroBuildSetStatusIds({ from: jest.fn(() => query) }),
    ).rejects.toThrow("network down");
  });

  it("throws when a draft cannot be loaded", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });

    await expect(
      fetchDraftHeroBuildSet({ from: jest.fn(() => query) }, "bastet"),
    ).rejects.toThrow("network down");
  });

  it("throws when a draft cannot be deleted", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });

    await expect(
      deleteDraftHeroBuildSet({ from: jest.fn(() => query) }, "bastet"),
    ).rejects.toThrow("network down");
  });

  it("fetches only the published build set for a hero", async () => {
    const query = createQueryResult({
      data: { payload: buildSet },
      error: null,
    });
    const client = { from: jest.fn(() => query) };

    await expect(fetchPublishedHeroBuildSet(client, "bastet")).resolves.toEqual(
      buildSet,
    );

    expect(client.from).toHaveBeenCalledWith("hero_build_sets");
    expect(query.select).toHaveBeenCalledWith("payload");
    expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
    expect(query.eq).toHaveBeenCalledWith("status", "published");
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("returns null when Supabase has no published build set", async () => {
    const query = createQueryResult({ data: null, error: null });
    const client = { from: jest.fn(() => query) };

    await expect(fetchPublishedHeroBuildSet(client, "unknown")).resolves.toBeNull();
  });

  it("fetches published hero ids", async () => {
    const query = createQueryResult({
      data: [{ hero_id: "bastet" }, { hero_id: "morana" }],
      error: null,
    });
    const client = { from: jest.fn(() => query) };

    await expect(fetchPublishedHeroIds(client)).resolves.toEqual([
      "bastet",
      "morana",
    ]);

    expect(client.from).toHaveBeenCalledWith("hero_build_sets");
    expect(query.select).toHaveBeenCalledWith("hero_id");
    expect(query.eq).toHaveBeenCalledWith("status", "published");
  });

  it("throws when published hero ids cannot be loaded", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });
    const client = { from: jest.fn(() => query) };

    await expect(fetchPublishedHeroIds(client)).rejects.toThrow("network down");
  });


  it("throws a readable error when fetching fails", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });
    const client = { from: jest.fn(() => query) };

    await expect(fetchPublishedHeroBuildSet(client, "bastet")).rejects.toThrow(
      "network down",
    );
  });

  it("upserts a draft or published build set by hero and status", async () => {
    const query = createQueryResult({ data: { hero_id: "bastet" }, error: null });
    const client = { from: jest.fn(() => query) };

    await saveHeroBuildSet(client, {
      buildSet,
      heroId: "bastet",
      status: "draft",
    });

    expect(client.from).toHaveBeenCalledWith("hero_build_sets");
    expect(query.upsert).toHaveBeenCalledWith(
      {
        hero_id: "bastet",
        payload: buildSet,
        status: "draft",
      },
      { onConflict: "hero_id,status" },
    );
    expect(query.select).toHaveBeenCalledWith("hero_id");
    expect(query.single).toHaveBeenCalledTimes(1);
  });

  it("deletes all stored build rows for a hero", async () => {
    const query = createQueryResult({ data: null, error: null });
    const client = { from: jest.fn(() => query) };

    await deleteHeroBuildSet(client, "bastet");

    expect(client.from).toHaveBeenCalledWith("hero_build_sets");
    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
  });

  it("loads a remote published build set before using local fallback", async () => {
    const remoteBuildSet = { schemaVersion: 2, tabs: [] } satisfies HeroBuildSet;
    const query = createQueryResult({
      data: { payload: remoteBuildSet },
      error: null,
    });
    const client = { from: jest.fn(() => query) };

    await expect(
      loadPublishedHeroBuildSet({
        client,
        fallbackBuildSet: buildSet,
        heroId: "bastet",
      }),
    ).resolves.toEqual(remoteBuildSet);
  });

  it("uses local fallback when remote has no published build set", async () => {
    const query = createQueryResult({ data: null, error: null });
    const client = { from: jest.fn(() => query) };

    await expect(
      loadPublishedHeroBuildSet({
        client,
        fallbackBuildSet: buildSet,
        heroId: "bastet",
      }),
    ).resolves.toEqual(buildSet);
  });

  it("uses local fallback when no Supabase client is configured", async () => {
    await expect(
      loadPublishedHeroBuildSet({
        client: null,
        fallbackBuildSet: buildSet,
        heroId: "bastet",
      }),
    ).resolves.toEqual(buildSet);
  });

  it("uses local fallback when remote published build fetch fails", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });
    const client = { from: jest.fn(() => query) };

    await expect(
      loadPublishedHeroBuildSet({
        client,
        fallbackBuildSet: buildSet,
        heroId: "bastet",
      }),
    ).resolves.toEqual(buildSet);
  });
});
