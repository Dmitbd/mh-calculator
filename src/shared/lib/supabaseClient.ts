import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import { readSupabaseConfig } from "./supabaseConfig";

export type AppSupabaseClient<Database> = ReturnType<
  typeof createClient<Database>
>;

type GenericAppSupabaseClient = ReturnType<typeof createClient>;

let cachedClient: GenericAppSupabaseClient | null = null;

export function getSupabaseClient(): GenericAppSupabaseClient | null;
export function getSupabaseClient<Database>(): AppSupabaseClient<Database> | null;
export function getSupabaseClient<Database>():
  | AppSupabaseClient<Database>
  | GenericAppSupabaseClient
  | null {
  if (Platform.OS === "web" && typeof window === "undefined") {
    return null;
  }

  const config = readSupabaseConfig();

  if (!config) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    });
  }

  return cachedClient as AppSupabaseClient<Database>;
}
