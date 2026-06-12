describe("resolveAssetUri", () => {
  const originalEnv = process.env;
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_ASSET_ORIGIN;
    process.env.NODE_ENV = "production";
    (global as { __DEV__?: boolean }).__DEV__ = false;
  });

  afterAll(() => {
    process.env = originalEnv;
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  function loadResolver(
    platform: "web" | "ios",
    options?: { hostUri?: string },
  ) {
    jest.doMock("react-native", () => ({
      Platform: { OS: platform },
    }));
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: {
        expoConfig: options?.hostUri ? { hostUri: options.hostUri } : undefined,
      },
    }));

    return require("../resolveAssetUri") as typeof import("../resolveAssetUri");
  }

  it("prefixes public asset paths with the Expo web base URL", () => {
    const { resolveAssetUri } = loadResolver("web");

    expect(resolveAssetUri("/img/branches/asterial.png")).toBe(
      "/mh-calculator/img/branches/asterial.png",
    );
  });

  it("keeps public asset paths rooted at localhost in web development", () => {
    process.env.NODE_ENV = "development";
    const { resolveAssetUri } = loadResolver("web");

    expect(resolveAssetUri("/img/branches/asterial.png")).toBe(
      "/img/branches/asterial.png",
    );
  });

  it("uses an absolute asset origin for native clients", () => {
    const { resolveAssetUri } = loadResolver("ios");

    expect(resolveAssetUri("img/branches/asterial.png")).toBe(
      "https://dmitbd.github.io/mh-calculator/img/branches/asterial.png",
    );
  });

  it("uses the Metro dev server for native clients in development", () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const { resolveAssetUri } = loadResolver("ios", {
      hostUri: "192.168.1.70:8081",
    });

    expect(resolveAssetUri("/img/skills/asterial/brighten.png")).toBe(
      "http://192.168.1.70:8081/img/skills/asterial/brighten.png",
    );
  });

  it("preserves absolute URLs", () => {
    const { resolveAssetUri } = loadResolver("web");

    expect(resolveAssetUri("https://example.com/icon.png")).toBe(
      "https://example.com/icon.png",
    );
  });
});
