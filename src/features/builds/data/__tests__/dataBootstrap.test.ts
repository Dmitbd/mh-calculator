import {
  BootstrapRequestError,
  invalidateDataBootstrap,
  loadDataBootstrap,
  parseBootstrapManifest,
  requestBootstrap,
} from "../dataBootstrap";

const validManifest = {
  status: "ok",
  contentVersion: "2026-08-13.1",
  contentUpdatedAt: "1970-01-01T00:00:00.000000Z",
  schemaVersion: 1,
  resources: {
    heroBuilds: {
      version: "2026-08-13.1",
      etag: `sha256:${"a".repeat(64)}`,
    },
  },
};

function responseFor(
  text: string,
  overrides: Partial<{
    body: ReadableStream<Uint8Array> | null;
    contentLength: string | null;
    ok: boolean;
    status: number;
    text: () => Promise<string>;
  }> = {},
) {
  const contentLength =
    overrides.contentLength === undefined
      ? String(new TextEncoder().encode(text).byteLength)
      : overrides.contentLength;

  return {
    body: overrides.body,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-length" ? contentLength : null,
    },
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    text: overrides.text ?? (async () => text),
  };
}

describe("data bootstrap", () => {
  afterEach(() => {
    invalidateDataBootstrap();
    jest.useRealTimers();
  });

  test("parses the exact compatible manifest contract", () => {
    expect(parseBootstrapManifest(validManifest)).toEqual(validManifest);
  });

  test.each([
    ["unknown root field", { ...validManifest, extra: true }],
    ["missing hero builds", { ...validManifest, resources: {} }],
    ["invalid etag", {
      ...validManifest,
      resources: { heroBuilds: { version: "v1", etag: "weak" } },
    }],
    ["too many resources", {
      ...validManifest,
      resources: Object.fromEntries(
        Array.from({ length: 17 }, (_, index) => [
          index === 0 ? "heroBuilds" : `resource-${index}`,
          { version: "v1", etag: `sha256:${"b".repeat(64)}` },
        ]),
      ),
    }],
  ])("rejects %s", (_label, body) => {
    expect(() => parseBootstrapManifest(body)).toThrow(BootstrapRequestError);
  });

  test("does not invoke accessor properties while parsing unknown JSON", () => {
    const statusGetter = jest.fn(() => "ok");
    const body = { ...validManifest } as Record<string, unknown>;
    Object.defineProperty(body, "status", { get: statusGetter });

    expect(() => parseBootstrapManifest(body)).toThrow(BootstrapRequestError);
    expect(statusGetter).not.toHaveBeenCalled();
  });

  test("uses one bounded public bootstrap request", async () => {
    const fetchImpl = jest.fn(async () =>
      responseFor(JSON.stringify(validManifest)),
    );

    await expect(
      requestBootstrap({
        config: {
          anonKey: "public-anon-key",
          url: "https://project.supabase.co/",
        },
        fetchImpl,
        timeoutMs: 2500,
      }),
    ).resolves.toEqual(validManifest);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://project.supabase.co/functions/v1/bootstrap",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "public-anon-key",
          Authorization: "Bearer public-anon-key",
        }),
        method: "GET",
        signal: expect.any(Object),
      }),
    );
  });

  test("classifies timeout, 5xx, invalid body and incompatible schema", async () => {
    jest.useFakeTimers();
    const pending = requestBootstrap({
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl: jest.fn(() => new Promise(() => undefined)),
      timeoutMs: 100,
    });
    jest.advanceTimersByTime(100);
    await expect(pending).rejects.toMatchObject({ kind: "timeout" });

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () =>
          responseFor("unavailable", { ok: false, status: 503 }),
        ),
      }),
    ).rejects.toMatchObject({ kind: "http" });

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () => responseFor("not-json")),
      }),
    ).rejects.toMatchObject({ kind: "invalid-body" });

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () =>
          responseFor(JSON.stringify({ ...validManifest, schemaVersion: 2 })),
        ),
      }),
    ).rejects.toMatchObject({ kind: "incompatible-schema" });
  });

  test("bounds response body reading with the same request timeout", async () => {
    jest.useFakeTimers();
    const pending = requestBootstrap({
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl: jest.fn(async () =>
        responseFor(JSON.stringify(validManifest), {
          text: () =>
            new Promise<string>((resolve) => {
              setTimeout(() => resolve(JSON.stringify(validManifest)), 200);
            }),
        }),
      ),
      timeoutMs: 100,
    });
    const outcome = expect(pending).rejects.toMatchObject({ kind: "timeout" });

    await jest.advanceTimersByTimeAsync(200);

    await outcome;
  });

  test.each([
    ["missing", null],
    ["invalid", "many"],
    ["oversized", String(32 * 1024 + 1)],
  ])("rejects %s Content-Length before native text fallback", async (_label, length) => {
    const readText = jest.fn(async () => JSON.stringify(validManifest));

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () =>
          responseFor(JSON.stringify(validManifest), {
            contentLength: length,
            text: readText,
          }),
        ),
      }),
    ).rejects.toMatchObject({ kind: "invalid-body" });
    expect(readText).not.toHaveBeenCalled();
  });

  test("verifies native fallback Content-Length using encoded multibyte bytes", async () => {
    const body = JSON.stringify({ ...validManifest, contentVersion: "версия" });
    const characterLength = body.length;
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(characterLength);

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () =>
          responseFor(body, { contentLength: String(characterLength) }),
        ),
      }),
    ).rejects.toMatchObject({ kind: "invalid-body" });
  });

  test("cancels an over-budget stream before releasing its reader", async () => {
    const events: string[] = [];
    const reader = {
      cancel: jest.fn(async () => {
        events.push("cancel");
      }),
      read: jest.fn(async () => ({
        done: false,
        value: new Uint8Array(32 * 1024 + 1),
      })),
      releaseLock: jest.fn(() => {
        events.push("release");
      }),
    };

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () => ({
          body: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
          headers: { get: () => null },
          ok: true,
          status: 200,
          text: jest.fn(async () => ""),
        })),
      }),
    ).rejects.toMatchObject({ kind: "invalid-body" });

    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["cancel", "release"]);
  });

  test("deduplicates compatible bootstrap and retries transient fallback", async () => {
    let resolveRequest!: (value: {
      ok: boolean;
      status: number;
      text: () => Promise<string>;
    }) => void;
    const fetchImpl = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(responseFor(JSON.stringify(validManifest)));
    const options = {
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl,
    };

    const first = loadDataBootstrap(options);
    const concurrent = loadDataBootstrap(options);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolveRequest(responseFor(JSON.stringify(validManifest)));
    await expect(first).resolves.toMatchObject({ source: "remote" });
    await expect(concurrent).resolves.toMatchObject({ source: "remote" });

    await loadDataBootstrap({ ...options, force: true });
    await expect(loadDataBootstrap(options)).resolves.toMatchObject({
      source: "remote",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  test("invalidation prevents an older in-flight response from restoring cache", async () => {
    let resolveFirst!: (value: {
      ok: boolean;
      status: number;
      text: () => Promise<string>;
    }) => void;
    const fetchImpl = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(responseFor(JSON.stringify(validManifest)));
    const options = {
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl,
    };

    const stale = loadDataBootstrap(options);
    invalidateDataBootstrap();
    resolveFirst(responseFor(JSON.stringify(validManifest)));
    await stale;

    await loadDataBootstrap(options);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
