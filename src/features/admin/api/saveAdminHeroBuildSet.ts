import {
  publishDraftHeroBuildSet,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

export function hasCreatePublicationConflict(
  publishedBuildSet: HeroBuildSet | null,
): boolean {
  return publishedBuildSet !== null;
}

export async function publishAdminHeroBuildSet(params: {
  buildSet: HeroBuildSet;
  client: HeroBuildSetSupabaseClient;
  expectedRevision: number;
  heroId: string;
}) {
  return publishDraftHeroBuildSet(params.client, {
    buildSet: params.buildSet,
    expectedRevision: params.expectedRevision,
    heroId: params.heroId,
  });
}
