import {
  HeroBuildSetSchemaError,
  parseHeroBuildSet,
} from "@/features/builds/model/heroBuildSetSchema";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import type { AppSupabaseClient } from "@/shared/lib/supabaseClient";

export type HeroBuildSetStatus = "draft" | "published";

export type HeroBuildSetStatusIds = {
  draftHeroIds: string[];
  publishedHeroIds: string[];
};

export type HeroBuildSetSupabaseClient = Pick<
  AppSupabaseClient,
  "from" | "rpc"
>;

export type HeroBuildSetRepositoryErrorKind = "invalid-data" | "network";

export class HeroBuildSetRepositoryError extends Error {
  readonly cause: unknown;
  readonly kind: HeroBuildSetRepositoryErrorKind;

  constructor(
    kind: HeroBuildSetRepositoryErrorKind,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "HeroBuildSetRepositoryError";
    this.kind = kind;
    this.cause = cause;
  }
}

export type HeroBuildSetFallbackOutcome =
  | { kind: "not-configured" }
  | { kind: "no-data" }
  | {
      error: HeroBuildSetRepositoryError;
      kind: HeroBuildSetRepositoryErrorKind;
    };

export async function fetchHeroBuildSetStatusIds(
  client: HeroBuildSetSupabaseClient,
): Promise<HeroBuildSetStatusIds> {
  const { data, error } = await client
    .from("hero_build_sets")
    .select("hero_id,status");

  if (error) {
    throw createNetworkError(error);
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
    throw createNetworkError(error);
  }

  return parseRowPayload(data?.payload, heroId);
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

  if (error) {
    throw createNetworkError(error);
  }

  return parseRowPayload(data?.payload, heroId);
}

export async function fetchPublishedHeroIds(
  client: HeroBuildSetSupabaseClient,
): Promise<string[]> {
  const { data, error } = await client
    .from("hero_build_sets")
    .select("hero_id")
    .eq("status", "published");

  if (error) {
    throw createNetworkError(error);
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
  const { error } = await client.rpc(
    "create_or_update_draft_hero_build_set",
    {
      p_hero_id: heroId,
      p_payload: buildSet,
    },
  );

  if (error) {
    throw createNetworkError(error);
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
    throw createNetworkError(error);
  }
}

export async function updatePublishedHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: { buildSet: HeroBuildSet; heroId: string },
): Promise<void> {
  const { buildSet, heroId } = params;
  const { error } = await client.rpc("update_published_hero_build_set", {
    p_hero_id: heroId,
    p_payload: buildSet,
  });

  if (error) {
    throw createNetworkError(error);
  }
}

export async function loadPublishedHeroBuildSet(params: {
  client: HeroBuildSetSupabaseClient | null;
  fallbackBuildSet: HeroBuildSet | null;
  heroId: string;
  onFallback?: (outcome: HeroBuildSetFallbackOutcome) => void;
}): Promise<HeroBuildSet | null> {
  const { client, fallbackBuildSet, heroId, onFallback } = params;

  if (!client) {
    onFallback?.({ kind: "not-configured" });
    return fallbackBuildSet;
  }

  let remoteBuildSet: HeroBuildSet | null;

  try {
    remoteBuildSet = await fetchPublishedHeroBuildSet(client, heroId);
  } catch (error) {
    const repositoryError =
      error instanceof HeroBuildSetRepositoryError
        ? error
        : createNetworkError(error);
    onFallback?.({ error: repositoryError, kind: repositoryError.kind });
    return fallbackBuildSet;
  }

  if (!remoteBuildSet) {
    onFallback?.({ kind: "no-data" });
    return fallbackBuildSet;
  }

  return remoteBuildSet;
}

function parseRowPayload(
  payload: unknown,
  expectedHeroId: string,
): HeroBuildSet | null {
  if (payload === undefined) {
    return null;
  }

  try {
    return parseHeroBuildSet(payload, expectedHeroId);
  } catch (error) {
    if (error instanceof HeroBuildSetSchemaError) {
      throw new HeroBuildSetRepositoryError(
        "invalid-data",
        error.message,
        error,
      );
    }

    throw error;
  }
}

function createNetworkError(error: unknown): HeroBuildSetRepositoryError {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "Supabase request failed";

  return new HeroBuildSetRepositoryError("network", message, error);
}
