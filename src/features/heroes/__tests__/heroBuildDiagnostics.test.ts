import { reportHeroBuildFallbackSelected } from "../model/heroBuildDiagnostics";

describe("hero build diagnostics", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("emits only the allowlisted hero-build fallback fields", () => {
    const info = jest.spyOn(console, "info").mockImplementation();

    reportHeroBuildFallbackSelected({
      heroId: "hero-id",
      reason: "network",
      route: "/heroes/hero-id",
    });

    expect(info).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: "hero-builds",
      event: "fallback-selected",
      heroId: "hero-id",
      reason: "network",
      resource: "heroBuilds",
      route: "/heroes/hero-id",
    });
  });
});
