import { reportRuntimeDiagnostic } from "../runtimeDiagnostics";

describe("reportRuntimeDiagnostic", () => {
  const originalConsoleInfo = console.info;

  afterEach(() => {
    console.info = originalConsoleInfo;
  });

  it("emits only the bounded structured diagnostic contract", () => {
    const info = jest.fn();
    console.info = info;

    reportRuntimeDiagnostic({
      area: "hero-builds",
      event: "fallback-selected",
      heroId: "hero-" + "x".repeat(120),
      reason: "network",
      resource: "heroBuilds",
    });

    expect(info).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: "hero-builds",
      event: "fallback-selected",
      heroId: `hero-${"x".repeat(59)}`,
      reason: "network",
      resource: "heroBuilds",
    });
  });

  it("never accepts raw errors, payloads or backend credentials", () => {
    const source = require("node:fs").readFileSync(
      require.resolve("../runtimeDiagnostics"),
      "utf8",
    );

    expect(source).not.toMatch(/\b(error|payload|body|stack|token|key|secret)\??:/i);
  });

  it("drops structurally injected fields instead of spreading them to logs", () => {
    const info = jest.fn();
    console.info = info;

    reportRuntimeDiagnostic({
      area: "hero-builds",
      event: "fallback-selected",
      reason: "network",
      payload: { access_token: "private" },
      raw: "backend response",
      secret: "do-not-log",
    } as Parameters<typeof reportRuntimeDiagnostic>[0]);

    expect(info).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: "hero-builds",
      event: "fallback-selected",
      reason: "network",
    });
  });
});
