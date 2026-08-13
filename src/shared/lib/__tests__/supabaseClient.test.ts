jest.mock("../supabaseConfig", () => ({
  readSupabaseConfig: () => ({
    anonKey: "e2e-public-anon-key",
    url: "https://e2e.invalid",
  }),
}));

import { getSupabaseClient } from "../supabaseClient";
import { Platform } from "react-native";

describe("getSupabaseClient", () => {
  it("does not initialize browser persistence during static web rendering", () => {
    const browserWindow = global.window;
    const platform = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    Object.defineProperty(global, "window", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getSupabaseClient()).toBeNull();
    } finally {
      Object.defineProperty(global, "window", {
        configurable: true,
        value: browserWindow,
      });
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: platform,
      });
    }
  });
});
