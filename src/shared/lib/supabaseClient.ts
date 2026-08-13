import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type { Database } from "./database.types";
import { readSupabaseConfig } from "./supabaseConfig";

export type AppSupabaseClient = ReturnType<typeof createClient<Database>>;

let cachedClient: AppSupabaseClient | null = null;

export function getSupabaseClient(): AppSupabaseClient | null {
  if (Platform.OS === "web" && typeof window === "undefined") {
    return null;
  }

  const config = readSupabaseConfig();

  if (!config) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    });
  }

  return cachedClient;
}
