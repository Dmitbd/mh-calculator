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
  heroId: string;
}): Promise<void> {
  await publishDraftHeroBuildSet(params.client, {
    buildSet: params.buildSet,
    heroId: params.heroId,
  });
}
