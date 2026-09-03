import {
  HeroBuildSetSchemaError,
  parseHeroBuildSet,
} from "@/features/builds/model/heroBuildSetSchema";
import type { HeroBuildSet } from "@/features/game-data/builds/types";
import type { HeroBuildDatabaseClient } from "../data/heroBuildSupabaseClient";

export type HeroBuildSetStatus = "draft" | "published";

export type HeroBuildSetRecord = {
  buildSet: HeroBuildSet;
  revision: number;
  status: HeroBuildSetStatus;
  updatedAt: string;
  updatedBy: string | null;
};

export type HeroBuildSetHistoryEvent =
  | "migrated"
  | "created_draft"
  | "updated_draft"
  | "published"
  | "updated_published"
  | "restored_published";

export type PublishedHeroBuildSetHistoryRecord = {
  buildSet: HeroBuildSet;
  createdAt: string;
  eventType: HeroBuildSetHistoryEvent;
  id: number;
  revision: number;
  updatedBy: string | null;
};

export type HeroBuildSetStatusIds = {
  draftHeroIds: string[];
  publishedHeroIds: string[];
};

export type HeroBuildSetSupabaseClient = Pick<
  HeroBuildDatabaseClient,
  "from" | "rpc"
>;

export type HeroBuildSetRepositoryErrorKind =
  | "conflict"
  | "invalid-data"
  | "network";

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

  return parseRowPayload(data, heroId);
}

export async function fetchPublishedHeroBuildSetRecord(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<HeroBuildSetRecord | null> {
  return fetchHeroBuildSetRecord(client, heroId, "published");
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

  return parseRowPayload(data, heroId);
}

export async function fetchDraftHeroBuildSetRecord(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<HeroBuildSetRecord | null> {
  return fetchHeroBuildSetRecord(client, heroId, "draft");
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
    expectedRevision: number | null;
    heroId: string;
  },
): Promise<HeroBuildSetRecord> {
  const { buildSet, expectedRevision, heroId } = params;
  const { data, error } = await client.rpc(
    "create_or_update_draft_hero_build_set",
    {
      p_expected_revision: expectedRevision,
      p_hero_id: heroId,
      p_payload: buildSet,
    },
  );

  if (error) {
    throw createMutationError(error);
  }

  return parseRecord(data, heroId, "draft");
}

export async function publishDraftHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: {
    buildSet: HeroBuildSet;
    expectedRevision: number;
    heroId: string;
  },
): Promise<HeroBuildSetRecord> {
  const { buildSet, expectedRevision, heroId } = params;
  const { data, error } = await client.rpc("publish_hero_build_set", {
    p_expected_revision: expectedRevision,
    p_hero_id: heroId,
    p_payload: buildSet,
  });

  if (error) {
    throw createMutationError(error);
  }

  return parseRecord(data, heroId, "published");
}

export async function updatePublishedHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: {
    buildSet: HeroBuildSet;
    expectedRevision: number;
    heroId: string;
  },
): Promise<HeroBuildSetRecord> {
  const { buildSet, expectedRevision, heroId } = params;
  const { data, error } = await client.rpc("update_published_hero_build_set", {
    p_expected_revision: expectedRevision,
    p_hero_id: heroId,
    p_payload: buildSet,
  });

  if (error) {
    throw createMutationError(error);
  }

  return parseRecord(data, heroId, "published");
}

export async function fetchPublishedHeroBuildSetHistory(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
): Promise<PublishedHeroBuildSetHistoryRecord[]> {
  const { data, error } = await client
    .from("hero_build_set_revisions")
    .select("id,revision,event_type,payload,updated_by,created_at")
    .eq("hero_id", heroId)
    .eq("status", "published")
    .order("revision", { ascending: false });

  if (error) {
    throw createNetworkError(error);
  }

  try {
    if (!Array.isArray(data)) {
      throw new Error("Hero build set history must be an array");
    }

    return data.map((row) => parseHistoryRecord(row, heroId));
  } catch (error) {
    throw createInvalidDataError(error);
  }
}

export async function restorePublishedHeroBuildSet(
  client: HeroBuildSetSupabaseClient,
  params: {
    expectedRevision: number;
    historyId: number;
    heroId: string;
  },
): Promise<HeroBuildSetRecord> {
  const { expectedRevision, historyId, heroId } = params;
  const { data, error } = await client.rpc(
    "restore_published_hero_build_set",
    {
      p_expected_revision: expectedRevision,
      p_hero_id: heroId,
      p_history_id: historyId,
    },
  );

  if (error) {
    throw createMutationError(error);
  }

  return parseRecord(data, heroId, "published");
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
  row: unknown,
  expectedHeroId: string,
): HeroBuildSet | null {
  if (row === undefined || row === null) {
    return null;
  }

  try {
    if (typeof row !== "object" || Array.isArray(row)) {
      throw new HeroBuildSetSchemaError([
        { message: "must be a plain object", path: "row" },
      ]);
    }

    const payloadDescriptor = Object.getOwnPropertyDescriptor(row, "payload");

    if (!payloadDescriptor) {
      throw new HeroBuildSetSchemaError([
        { message: "must be an own data property", path: "row.payload" },
      ]);
    }

    if (!("value" in payloadDescriptor)) {
      throw new HeroBuildSetSchemaError([
        { message: "must be a plain data property", path: "row.payload" },
      ]);
    }

    return parseHeroBuildSet(payloadDescriptor.value, expectedHeroId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid hero build set row";
    throw new HeroBuildSetRepositoryError("invalid-data", message, error);
  }
}

async function fetchHeroBuildSetRecord(
  client: HeroBuildSetSupabaseClient,
  heroId: string,
  status: HeroBuildSetStatus,
): Promise<HeroBuildSetRecord | null> {
  const { data, error } = await client
    .from("hero_build_sets")
    .select("payload,revision,status,updated_at,updated_by")
    .eq("hero_id", heroId)
    .eq("status", status)
    .maybeSingle();

  if (error) {
    throw createNetworkError(error);
  }

  if (data === undefined || data === null) {
    return null;
  }

  return parseRecord(data, heroId, status);
}

function parseRecord(
  row: unknown,
  heroId: string,
  expectedStatus: HeroBuildSetStatus,
): HeroBuildSetRecord {
  try {
    const buildSet = parseRowPayload(row, heroId);

    if (!buildSet) {
      throw new Error("Hero build set row is missing");
    }

    const revision = readOwnDataProperty(row, "revision");
    const status = readOwnDataProperty(row, "status");
    const updatedAt = readOwnDataProperty(row, "updated_at");
    const updatedBy = readOwnDataProperty(row, "updated_by");

    if (!Number.isSafeInteger(revision) || (revision as number) < 1) {
      throw new Error("Hero build set revision must be a positive integer");
    }
    if (status !== expectedStatus) {
      throw new Error(`Hero build set status must be ${expectedStatus}`);
    }
    if (typeof updatedAt !== "string") {
      throw new Error("Hero build set updated_at must be a string");
    }
    if (updatedBy !== null && typeof updatedBy !== "string") {
      throw new Error("Hero build set updated_by must be a string or null");
    }

    return {
      buildSet,
      revision: revision as number,
      status: expectedStatus,
      updatedAt,
      updatedBy,
    };
  } catch (error) {
    if (
      error instanceof HeroBuildSetRepositoryError &&
      error.kind === "invalid-data"
    ) {
      throw error;
    }
    throw createInvalidDataError(error);
  }
}

function parseHistoryRecord(
  row: unknown,
  heroId: string,
): PublishedHeroBuildSetHistoryRecord {
  const buildSet = parseRowPayload(row, heroId);

  if (!buildSet) {
    throw new Error("Hero build set history row is missing");
  }

  const id = readOwnDataProperty(row, "id");
  const revision = readOwnDataProperty(row, "revision");
  const eventType = readOwnDataProperty(row, "event_type");
  const createdAt = readOwnDataProperty(row, "created_at");
  const updatedBy = readOwnDataProperty(row, "updated_by");
  const validEvents: readonly HeroBuildSetHistoryEvent[] = [
    "migrated",
    "created_draft",
    "updated_draft",
    "published",
    "updated_published",
    "restored_published",
  ];

  if (!Number.isSafeInteger(id) || (id as number) < 1) {
    throw new Error("Hero build set history id must be a positive integer");
  }
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) {
    throw new Error("Hero build set history revision must be a positive integer");
  }
  if (!validEvents.includes(eventType as HeroBuildSetHistoryEvent)) {
    throw new Error("Hero build set history event is invalid");
  }
  if (typeof createdAt !== "string") {
    throw new Error("Hero build set history created_at must be a string");
  }
  if (updatedBy !== null && typeof updatedBy !== "string") {
    throw new Error("Hero build set history updated_by must be a string or null");
  }

  return {
    buildSet,
    createdAt,
    eventType: eventType as HeroBuildSetHistoryEvent,
    id: id as number,
    revision: revision as number,
    updatedBy,
  };
}

function readOwnDataProperty(row: unknown, key: string): unknown {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw new Error("Hero build set row must be an object");
  }

  const descriptor = Object.getOwnPropertyDescriptor(row, key);
  if (!descriptor || !("value" in descriptor)) {
    throw new Error(`Hero build set row.${key} must be an own data property`);
  }
  return descriptor.value;
}

function createInvalidDataError(error: unknown): HeroBuildSetRepositoryError {
  const message = error instanceof Error ? error.message : "Invalid hero build set row";
  return new HeroBuildSetRepositoryError("invalid-data", message, error);
}

function createMutationError(error: unknown): HeroBuildSetRepositoryError {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P4090"
  ) {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "Hero build set revision conflict";
    return new HeroBuildSetRepositoryError("conflict", message, error);
  }

  return createNetworkError(error);
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
