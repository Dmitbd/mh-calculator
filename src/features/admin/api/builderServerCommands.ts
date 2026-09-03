import {
  createOrUpdateDraftHeroBuildSet,
  HeroBuildSetRepositoryError,
  publishDraftHeroBuildSet,
  updatePublishedHeroBuildSet,
  type HeroBuildSetSupabaseClient,
  type HeroBuildSet,
} from "@/features/builds";

export type BuilderServerCommandOutcome =
  | { kind: "success"; revision: number }
  | { kind: "conflict"; error: HeroBuildSetRepositoryError }
  | { kind: "error"; error: unknown };

export class BuilderRevisionStore {
  private revisionsByHero: Record<string, number> = {};

  get(heroId: string): number | null {
    return this.revisionsByHero[heroId] ?? null;
  }

  set(heroId: string, revision: number | null): void {
    if (revision === null) delete this.revisionsByHero[heroId];
    else this.revisionsByHero[heroId] = revision;
  }

  clear(): void {
    this.revisionsByHero = {};
  }
}

export async function runBuilderServerCommand(params: {
  fallbackRevision: number;
  run: () => Promise<{ revision?: number } | null | undefined>;
}): Promise<BuilderServerCommandOutcome> {
  try {
    const record = await params.run();
    return {
      kind: "success",
      revision: record?.revision ?? params.fallbackRevision,
    };
  } catch (error) {
    if (error instanceof HeroBuildSetRepositoryError && error.kind === "conflict") {
      return { kind: "conflict", error };
    }
    return { kind: "error", error };
  }
}

type BuilderMutationParams = {
  buildSet: HeroBuildSet;
  client: HeroBuildSetSupabaseClient;
  expectedRevision: number | null;
  heroId: string;
};

export function runBuilderDraftCommand(
  params: BuilderMutationParams & { run?: typeof createOrUpdateDraftHeroBuildSet },
): Promise<BuilderServerCommandOutcome> {
  const run = params.run ?? createOrUpdateDraftHeroBuildSet;
  return runBuilderServerCommand({
    fallbackRevision: (params.expectedRevision ?? 0) + 1,
    run: () => run(params.client, toRepositoryParams(params)),
  });
}

export function runBuilderPublishCommand(
  params: BuilderMutationParams & { expectedRevision: number; run?: typeof publishDraftHeroBuildSet },
): Promise<BuilderServerCommandOutcome> {
  const run = params.run ?? publishDraftHeroBuildSet;
  return runBuilderServerCommand({
    fallbackRevision: params.expectedRevision + 1,
    run: () => run(params.client, toRequiredRevisionParams(params)),
  });
}

export function runBuilderUpdateCommand(
  params: BuilderMutationParams & { expectedRevision: number; run?: typeof updatePublishedHeroBuildSet },
): Promise<BuilderServerCommandOutcome> {
  const run = params.run ?? updatePublishedHeroBuildSet;
  return runBuilderServerCommand({
    fallbackRevision: params.expectedRevision + 1,
    run: () => run(params.client, toRequiredRevisionParams(params)),
  });
}

function toRepositoryParams(params: BuilderMutationParams) {
  return {
    buildSet: params.buildSet,
    expectedRevision: params.expectedRevision,
    heroId: params.heroId,
  };
}

function toRequiredRevisionParams(
  params: BuilderMutationParams & { expectedRevision: number },
) {
  return {
    buildSet: params.buildSet,
    expectedRevision: params.expectedRevision,
    heroId: params.heroId,
  };
}
