import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import * as repository from "../heroBuildSetRepository";

import {
  createOrUpdateDraftHeroBuildSet,
  fetchHeroBuildSetStatusIds,
  fetchDraftHeroBuildSet,
  fetchPublishedHeroBuildSet,
  fetchPublishedHeroIds,
  loadPublishedHeroBuildSet,
  publishDraftHeroBuildSet,
  updatePublishedHeroBuildSet,
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
    rpc: jest.Mock;
    select: jest.Mock;
    single: jest.Mock;
    then: jest.Mock;
    update: jest.Mock;
    upsert: jest.Mock;
  } = {} as never;

  query.delete = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.maybeSingle = jest.fn(async () => result);
  query.rpc = jest.fn(async () => result);
  query.select = jest.fn(() => query);
  query.single = jest.fn(async () => result);
  query.then = jest.fn((resolve, reject) =>
    Promise.resolve(result).then(resolve, reject),
  );
  query.update = jest.fn(() => query);
  query.upsert = jest.fn(() => query);

  return query;
}

function createClient(query: ReturnType<typeof createQueryResult>) {
  return {
    from: jest.fn(() => query),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
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
    const client = createClient(query);

    await expect(fetchHeroBuildSetStatusIds(client)).resolves.toEqual({
      draftHeroIds: ["bastet"],
      publishedHeroIds: ["morana", "bastet"],
    });
    expect(query.select).toHaveBeenCalledWith("hero_id,status");
  });

  it("fetches only the draft build set for a hero", async () => {
    const query = createQueryResult({ data: { payload: buildSet }, error: null });
    const client = createClient(query);

    await expect(fetchDraftHeroBuildSet(client, "bastet")).resolves.toEqual(
      buildSet,
    );
    expect(query.select).toHaveBeenCalledWith("payload");
    expect(query.eq).toHaveBeenCalledWith("hero_id", "bastet");
    expect(query.eq).toHaveBeenCalledWith("status", "draft");
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("throws when the status catalog cannot be loaded", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });

    await expect(
      fetchHeroBuildSetStatusIds(createClient(query)),
    ).rejects.toThrow("network down");
  });

  it("throws when a draft cannot be loaded", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });

    await expect(
      fetchDraftHeroBuildSet(createClient(query), "bastet"),
    ).rejects.toThrow("network down");
  });

  it("fetches only the published build set for a hero", async () => {
    const query = createQueryResult({
      data: { payload: buildSet },
      error: null,
    });
    const client = createClient(query);

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
    const client = createClient(query);

    await expect(fetchPublishedHeroBuildSet(client, "unknown")).resolves.toBeNull();
  });

  it("fetches published hero ids", async () => {
    const query = createQueryResult({
      data: [{ hero_id: "bastet" }, { hero_id: "morana" }],
      error: null,
    });
    const client = createClient(query);

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
    const client = createClient(query);

    await expect(fetchPublishedHeroIds(client)).rejects.toThrow("network down");
  });


  it("throws a readable error when fetching fails", async () => {
    const query = createQueryResult({
      data: null,
      error: { message: "network down" },
    });
    const client = createClient(query);

    await expect(fetchPublishedHeroBuildSet(client, "bastet")).rejects.toThrow(
      "network down",
    );
  });

  it("creates or updates only a draft row by hero identity", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const client = { from: jest.fn(), rpc };

    await createOrUpdateDraftHeroBuildSet(client, {
      buildSet,
      heroId: "bastet",
    });

    expect(rpc).toHaveBeenCalledWith("create_or_update_draft_hero_build_set", {
      p_hero_id: "bastet",
      p_payload: buildSet,
    });
  });

  it("publishes a draft through the atomic database transition", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const client = { from: jest.fn(), rpc };

    await publishDraftHeroBuildSet(client, {
      buildSet,
      heroId: "bastet",
    });

    expect(rpc).toHaveBeenCalledWith("publish_hero_build_set", {
      p_hero_id: "bastet",
      p_payload: buildSet,
    });
  });

  it("surfaces an atomic publication error", async () => {
    const rpc = jest.fn(async () => ({
      data: null,
      error: { message: "draft not found" },
    }));

    await expect(
      publishDraftHeroBuildSet({ from: jest.fn(), rpc }, {
        buildSet,
        heroId: "bastet",
      }),
    ).rejects.toThrow("draft not found");
  });

  it("updates payload only on an existing published row", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const client = { from: jest.fn(), rpc };

    await updatePublishedHeroBuildSet(client, {
      buildSet,
      heroId: "bastet",
    });

    expect(rpc).toHaveBeenCalledWith("update_published_hero_build_set", {
      p_hero_id: "bastet",
      p_payload: buildSet,
    });
  });

  it("does not expose draft or published deletion operations", () => {
    expect(repository).not.toHaveProperty("deleteDraftHeroBuildSet");
    expect(repository).not.toHaveProperty("deleteHeroBuildSet");
  });

  it("loads a remote published build set before using local fallback", async () => {
    const remoteBuildSet = { schemaVersion: 2, tabs: [] } satisfies HeroBuildSet;
    const query = createQueryResult({
      data: { payload: remoteBuildSet },
      error: null,
    });
    const client = createClient(query);

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
    const client = createClient(query);

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
    const client = createClient(query);

    await expect(
      loadPublishedHeroBuildSet({
        client,
        fallbackBuildSet: buildSet,
        heroId: "bastet",
      }),
    ).resolves.toEqual(buildSet);
  });
});
