export type SupabaseConfig = {
  anonKey: string;
  url: string;
};

type SupabaseEnv = Record<string, string | undefined>;

export function readSupabaseConfig(
  env?: SupabaseEnv,
): SupabaseConfig | null {
  const url = (
    env?.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  )?.trim();
  const anonKey = (
    env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, url };
}
