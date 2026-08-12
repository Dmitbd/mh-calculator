import {
  deleteDraftHeroBuildSet,
  saveHeroBuildSet,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

export function hasCreatePublicationConflict(
  publishedBuildSet: HeroBuildSet | null,
): boolean {
  return publishedBuildSet !== null;
}

export type PublishAdminHeroBuildSetResult = {
  draftCleanupError: Error | null;
};

export async function publishAdminHeroBuildSet(params: {
  buildSet: HeroBuildSet;
  client: HeroBuildSetSupabaseClient;
  heroId: string;
}): Promise<PublishAdminHeroBuildSetResult> {
  await saveHeroBuildSet(params.client, {
    buildSet: params.buildSet,
    heroId: params.heroId,
    status: "published",
  });

  try {
    await deleteDraftHeroBuildSet(params.client, params.heroId);
    return { draftCleanupError: null };
  } catch (error) {
    return {
      draftCleanupError:
        error instanceof Error
          ? error
          : new Error("Не удалось удалить черновик."),
    };
  }
}
