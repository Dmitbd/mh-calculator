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

type SupabaseQuery = {
  delete: () => SupabaseQuery;
  eq: (column: string, value: string) => SupabaseQuery;
  maybeSingle: () => Promise<QueryResult<HeroBuildSetRow>>;
  select: (columns: string) => SupabaseQuery;
  single: () => Promise<QueryResult<unknown>>;
  then: Promise<QueryResult<unknown>>["then"];
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
};

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

export async function saveHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: {
    buildSet: HeroBuildSet;
    heroId: string;
    status: HeroBuildSetStatus;
  },
): Promise<void> {
  const { buildSet, heroId, status } = params;
  const { error } = await client
    .from("hero_build_sets")
    .upsert(
      {
        hero_id: heroId,
        payload: buildSet,
        status,
      },
      { onConflict: "hero_id,status" },
    )
    .select("hero_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<void> {
  const { error } = await (client
    .from("hero_build_sets")
    .delete()
    .eq("hero_id", heroId) as unknown as Promise<QueryResult<unknown>>);

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
