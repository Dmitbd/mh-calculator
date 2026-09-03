import {
  getSupabaseClient,
  type AppSupabaseClient,
} from "@/shared/lib/supabaseClient";

import type { Database } from "./database.types";

export type HeroBuildDatabaseClient = AppSupabaseClient<Database>;

export function getHeroBuildSupabaseClient(): HeroBuildDatabaseClient | null {
  return getSupabaseClient<Database>();
}
