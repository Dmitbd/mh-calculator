import { reportRuntimeDiagnostic } from "../runtimeDiagnostics";

describe("reportRuntimeDiagnostic", () => {
  const originalConsoleInfo = console.info;

  afterEach(() => {
    console.info = originalConsoleInfo;
  });

  it("emits only the bounded structured diagnostic contract", () => {
    const info = jest.fn();
    console.info = info;

    reportRuntimeDiagnostic(
      "area-" + "a".repeat(120),
      "event-" + "e".repeat(120),
      {
        ["attribute-" + "k".repeat(120)]: "value-" + "v".repeat(120),
      },
    );

    expect(info).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: `area-${"a".repeat(59)}`,
      event: `event-${"e".repeat(58)}`,
      [`attribute-${"k".repeat(54)}`]: `value-${"v".repeat(58)}`,
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

    reportRuntimeDiagnostic("hero-builds", "fallback-selected", {
      access_token: "private",
      error: new Error("private"),
      payload: { access_token: "private" },
      raw: "backend response",
      reason: "network",
      secret: "do-not-log",
    } as unknown as Readonly<Record<string, string>>);

    expect(info).toHaveBeenCalledWith("MH_DIAGNOSTIC", {
      area: "hero-builds",
      event: "fallback-selected",
      reason: "network",
    });
  });
});
