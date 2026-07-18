import {
  saveHeroBuildSet,
  type HeroBuildSetStatus,
  type HeroBuildSetSupabaseClient,
} from "@/features/builds";
import type { HeroBuildSet } from "@/features/game-data/heroes/types";

export async function saveAdminHeroBuildSet(params: {
  buildSet: HeroBuildSet;
  client: HeroBuildSetSupabaseClient;
  heroId: string;
  refreshPublishedHeroIds: () => Promise<void>;
  status: HeroBuildSetStatus;
}): Promise<void> {
  await saveHeroBuildSet(params.client, {
    buildSet: params.buildSet,
    heroId: params.heroId,
    status: params.status,
  });

  if (params.status === "published") {
    await params.refreshPublishedHeroIds();
  }
}
