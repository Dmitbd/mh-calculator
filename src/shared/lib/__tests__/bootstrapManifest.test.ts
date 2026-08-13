import {
  BootstrapManifestError,
  parseBootstrapManifestRpcResponse,
} from "../../../../supabase/functions/bootstrap/manifest";

const ZERO_ROWS_ETAG = `sha256:${
  "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
}`;

function rpcRow(overrides: Record<string, unknown> = {}) {
  return {
    published_count: 0,
    version: "hero-builds:4f53cda18c2baa0c",
    etag: ZERO_ROWS_ETAG,
    ...overrides,
  };
}

describe("bootstrap Edge manifest RPC response", () => {
  test("accepts the deterministic zero-row manifest", () => {
    expect(parseBootstrapManifestRpcResponse([rpcRow()])).toEqual({
      publishedCount: 0,
      version: "hero-builds:4f53cda18c2baa0c",
      etag: ZERO_ROWS_ETAG,
    });
  });

  test("accepts a complete count beyond the Data API row cap", () => {
    expect(
      parseBootstrapManifestRpcResponse([
        rpcRow({ published_count: 1_205 }),
      ]).publishedCount,
    ).toBe(1_205);
  });

  test.each([
    ["not an array", rpcRow()],
    ["no rows", []],
    ["multiple rows", [rpcRow(), rpcRow()]],
    ["missing field", [{ version: rpcRow().version, etag: ZERO_ROWS_ETAG }]],
    ["extra field", [rpcRow({ payload: {} })]],
    ["negative count", [rpcRow({ published_count: -1 })]],
    ["fractional count", [rpcRow({ published_count: 1.5 })]],
    ["oversized count", [rpcRow({ published_count: 100_001 })]],
    ["invalid etag", [rpcRow({ etag: "sha256:not-a-digest" })]],
    ["mismatched version", [rpcRow({ version: "hero-builds:ffffffffffffffff" })]],
  ])("rejects malformed response: %s", (_label, value) => {
    expect(() => parseBootstrapManifestRpcResponse(value)).toThrow(
      BootstrapManifestError,
    );
  });

  test("rejects accessor-backed fields without invoking them", () => {
    const getter = jest.fn(() => 0);
    const value = rpcRow();
    Object.defineProperty(value, "published_count", { get: getter });

    expect(() => parseBootstrapManifestRpcResponse([value])).toThrow(
      BootstrapManifestError,
    );
    expect(getter).not.toHaveBeenCalled();
  });
});
