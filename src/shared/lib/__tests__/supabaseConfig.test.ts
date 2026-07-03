import { readSupabaseConfig } from "../supabaseConfig";

describe("readSupabaseConfig", () => {
  it("returns null when Supabase env vars are missing", () => {
    expect(readSupabaseConfig({})).toBeNull();
  });

  it("reads Expo public Supabase env vars", () => {
    expect(
      readSupabaseConfig({
        EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "publishable-key",
      }),
    ).toEqual({
      anonKey: "publishable-key",
      url: "https://example.supabase.co",
    });
  });
});
