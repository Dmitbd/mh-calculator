import type { HeroBuildSet } from "@/features/game-data/heroes/types";

export type HeroBuildSetStatus = "draft" | "published";

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type HeroBuildSetRow = {
  payload: HeroBuildSet;
};

type HeroBuildSetHeroIdRow = {
  hero_id: string;
};

type HeroBuildSetStatusRow = {
  hero_id: string;
  status: HeroBuildSetStatus;
};

export type HeroBuildSetStatusIds = {
  draftHeroIds: string[];
  publishedHeroIds: string[];
};

type SupabaseQuery = {
  eq: (column: string, value: string) => SupabaseQuery;
  maybeSingle: () => Promise<QueryResult<HeroBuildSetRow>>;
  select: (columns: string) => SupabaseQuery;
  single: () => Promise<QueryResult<unknown>>;
  then: Promise<QueryResult<unknown>>["then"];
  update: (row: { payload: HeroBuildSet }) => SupabaseQuery;
  upsert: (
    row: {
      hero_id: string;
      payload: HeroBuildSet;
      status: HeroBuildSetStatus;
    },
    options: { onConflict: string },
  ) => SupabaseQuery;
};

export type HeroBuildSetSupabaseClient = {
  from: (table: "hero_build_sets") => SupabaseQuery;
  rpc: (
    functionName: "publish_hero_build_set",
    params: { p_hero_id: string; p_payload: HeroBuildSet },
  ) => Promise<QueryResult<unknown>>;
};

export async function fetchHeroBuildSetStatusIds(
  client: HeroBuildSetSupabaseClient,
): Promise<HeroBuildSetStatusIds> {
  const { data, error } = await (client
    .from("hero_build_sets")
    .select("hero_id,status") as unknown as Promise<
    QueryResult<HeroBuildSetStatusRow[]>
  >);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<HeroBuildSetStatusIds>(
    (ids, row) => {
      if (row.status === "draft") {
        ids.draftHeroIds.push(row.hero_id);
      } else {
        ids.publishedHeroIds.push(row.hero_id);
      }
      return ids;
    },
    { draftHeroIds: [], publishedHeroIds: [] },
  );
}

export async function fetchPublishedHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<HeroBuildSet | null> {
  const { data, error } = await client
    .from("hero_build_sets")
    .select("payload")
    .eq("hero_id", heroId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.payload ?? null;
}

export async function fetchDraftHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<HeroBuildSet | null> {
  const { data, error } = await client
    .from("hero_build_sets")
    .select("payload")
    .eq("hero_id", heroId)
    .eq("status", "draft")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.payload ?? null;
}

export async function fetchPublishedHeroIds(
  client: HeroBuildSetSupabaseClient,
): Promise<string[]> {
  const { data, error } = await (client
    .from("hero_build_sets")
    .select("hero_id")
    .eq("status", "published") as unknown as Promise<
    QueryResult<HeroBuildSetHeroIdRow[]>
  >);

  if (error) {
    throw new Error(error.message);
  }

  return data?.map((row) => row.hero_id) ?? [];
}

export async function createOrUpdateDraftHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: {
    buildSet: HeroBuildSet;
    heroId: string;
  },
): Promise<void> {
  const { buildSet, heroId } = params;
  const { error } = await client
    .from("hero_build_sets")
    .upsert(
      {
        hero_id: heroId,
        payload: buildSet,
        status: "draft",
      },
      { onConflict: "hero_id" },
    )
    .select("hero_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
}

export async function publishDraftHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: { buildSet: HeroBuildSet; heroId: string },
): Promise<void> {
  const { buildSet, heroId } = params;
  const { error } = await client.rpc("publish_hero_build_set", {
    p_hero_id: heroId,
    p_payload: buildSet,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePublishedHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: { buildSet: HeroBuildSet; heroId: string },
): Promise<void> {
  const { buildSet, heroId } = params;
  const { error } = await client
    .from("hero_build_sets")
    .update({ payload: buildSet })
    .eq("hero_id", heroId)
    .eq("status", "published")
    .select("hero_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadPublishedHeroBuildSet(params: {
  client: HeroBuildSetSupabaseClient | null;
  fallbackBuildSet: HeroBuildSet | null;
  heroId: string;
}): Promise<HeroBuildSet | null> {
  const { client, fallbackBuildSet, heroId } = params;

  if (!client) {
    return fallbackBuildSet;
  }

  let remoteBuildSet: HeroBuildSet | null = null;

  try {
    remoteBuildSet = await fetchPublishedHeroBuildSet(client, heroId);
  } catch {
    return fallbackBuildSet;
  }

  return remoteBuildSet ?? fallbackBuildSet;
}
