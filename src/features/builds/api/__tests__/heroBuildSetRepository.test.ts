import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";
import { parseHeroBuildSet } from "@/features/builds/model/heroBuildSetSchema";
import * as repository from "../heroBuildSetRepository";

import {
  createOrUpdateDraftHeroBuildSet,
  fetchHeroBuildSetStatusIds,
  fetchDraftHeroBuildSet,
  fetchPublishedHeroBuildSet,
  fetchPublishedHeroIds,
  HeroBuildSetRepositoryError,
  type HeroBuildSetSupabaseClient,
  loadPublishedHeroBuildSet,
  publishDraftHeroBuildSet,
  updatePublishedHeroBuildSet,
} from "../heroBuildSetRepository";

const buildSet = parseHeroBuildSet(bastetBuild, "bastet");

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

function createClient(
  query: ReturnType<typeof createQueryResult>,
): HeroBuildSetSupabaseClient {
  return {
    from: jest.fn(() => query),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  } as unknown as HeroBuildSetSupabaseClient;
}

function createRpcClient(rpc: jest.Mock): HeroBuildSetSupabaseClient {
  return { from: jest.fn(), rpc } as unknown as HeroBuildSetSupabaseClient;
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

  it("rejects malformed draft payloads at the same read boundary", async () => {
    const query = createQueryResult({
      data: { payload: { schemaVersion: 2, tabs: "not-an-array" } },
      error: null,
    });

    await expect(
      fetchDraftHeroBuildSet(createClient(query), "bastet"),
    ).rejects.toMatchObject({ kind: "invalid-data" });
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

  it.each([
    ["missing", {}],
    ["inherited", Object.create({ payload: buildSet })],
  ])("rejects a non-null row with a %s payload property", async (_, row) => {
    const query = createQueryResult({ data: row, error: null });

    await expect(
      fetchPublishedHeroBuildSet(createClient(query), "bastet"),
    ).rejects.toMatchObject({
      cause: {
        issues: expect.arrayContaining([
          expect.objectContaining({ path: "row.payload" }),
        ]),
      },
      kind: "invalid-data",
    });
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

    await expect(fetchPublishedHeroBuildSet(client, "bastet")).rejects.toMatchObject({
      kind: "network",
      message: "network down",
    });
  });

  it("rejects malformed remote payloads with a typed invalid-data error", async () => {
    const query = createQueryResult({
      data: { payload: { schemaVersion: 999, tabs: [] } },
      error: null,
    });

    await expect(
      fetchPublishedHeroBuildSet(createClient(query), "bastet"),
    ).rejects.toEqual(
      expect.objectContaining<Partial<HeroBuildSetRepositoryError>>({
        kind: "invalid-data",
        name: "HeroBuildSetRepositoryError",
      }),
    );
  });

  it("maps unexpected parser property failures to invalid data", async () => {
    const payload = structuredClone(buildSet) as unknown as Record<string, unknown>;
    Object.defineProperty(payload, "schemaVersion", {
      get() {
        throw new Error("getter exploded");
      },
    });
    const query = createQueryResult({ data: { payload }, error: null });

    await expect(
      fetchPublishedHeroBuildSet(createClient(query), "bastet"),
    ).rejects.toMatchObject({
      kind: "invalid-data",
      name: "HeroBuildSetRepositoryError",
    });
  });

  it.each(["stateful", "throwing"] as const)(
    "rejects a %s row payload accessor as invalid data without invoking it",
    async (behavior) => {
      let calls = 0;
      const row = {};
      Object.defineProperty(row, "payload", {
        enumerable: true,
        get() {
          calls += 1;
          if (behavior === "throwing") {
            throw new Error("row payload getter exploded");
          }
          return calls === 1 ? buildSet : null;
        },
      });
      const query = createQueryResult({ data: row, error: null });

      await expect(
        fetchPublishedHeroBuildSet(createClient(query), "bastet"),
      ).rejects.toMatchObject({
        kind: "invalid-data",
        name: "HeroBuildSetRepositoryError",
      });
      expect(calls).toBe(0);
    },
  );

  it("rejects a valid payload stored under the wrong hero identity", async () => {
    const query = createQueryResult({
      data: { payload: buildSet },
      error: null,
    });

    await expect(
      fetchPublishedHeroBuildSet(createClient(query), "morana"),
    ).rejects.toMatchObject({ kind: "invalid-data" });
  });

  it("creates or updates only a draft row by hero identity", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const client = createRpcClient(rpc);

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
    const client = createRpcClient(rpc);

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
      publishDraftHeroBuildSet(createRpcClient(rpc), {
        buildSet,
        heroId: "bastet",
      }),
    ).rejects.toThrow("draft not found");
  });

  it("updates payload only on an existing published row", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const client = createRpcClient(rpc);

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
    const remoteBuildSet = structuredClone(buildSet);
    remoteBuildSet.tabs[0].label = "Remote PvP";
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

  it("reports no-data fallback separately from network and invalid data", async () => {
    const noDataFallback = jest.fn();
    const noDataClient = createClient(
      createQueryResult({ data: null, error: null }),
    );

    await loadPublishedHeroBuildSet({
      client: noDataClient,
      fallbackBuildSet: buildSet,
      heroId: "bastet",
      onFallback: noDataFallback,
    });

    expect(noDataFallback).toHaveBeenCalledWith({ kind: "no-data" });

    const networkFallback = jest.fn();
    const networkClient = createClient(
      createQueryResult({ data: null, error: { message: "network down" } }),
    );

    await loadPublishedHeroBuildSet({
      client: networkClient,
      fallbackBuildSet: buildSet,
      heroId: "bastet",
      onFallback: networkFallback,
    });

    expect(networkFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ kind: "network" }),
        kind: "network",
      }),
    );
  });

  it("falls back without accepting invalid remote data and reports the cause", async () => {
    const onFallback = jest.fn();
    const invalidRemote = { ...buildSet, schemaVersion: 999 };
    const client = createClient(
      createQueryResult({ data: { payload: invalidRemote }, error: null }),
    );

    await expect(
      loadPublishedHeroBuildSet({
        client,
        fallbackBuildSet: buildSet,
        heroId: "bastet",
        onFallback,
      }),
    ).resolves.toBe(buildSet);

    expect(onFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ kind: "invalid-data" }),
        kind: "invalid-data",
      }),
    );
  });
});
