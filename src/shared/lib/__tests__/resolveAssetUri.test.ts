describe("resolveAssetUri", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_ASSET_ORIGIN;
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadResolver(platform: "web" | "ios") {
    jest.doMock("react-native", () => ({
      Platform: { OS: platform },
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

  it("preserves absolute URLs", () => {
    const { resolveAssetUri } = loadResolver("web");

    expect(resolveAssetUri("https://example.com/icon.png")).toBe(
      "https://example.com/icon.png",
    );
  });
});
