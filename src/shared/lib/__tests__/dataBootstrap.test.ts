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
  schemaVersion: 1,
  resources: {
    heroBuilds: {
      version: "2026-08-13.1",
      etag: `sha256:${"a".repeat(64)}`,
    },
  },
};

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
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(validManifest),
    }));

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
        fetchImpl: jest.fn(async () => ({
          ok: false,
          status: 503,
          text: async () => "unavailable",
        })),
      }),
    ).rejects.toMatchObject({ kind: "http" });

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () => ({
          ok: true,
          status: 200,
          text: async () => "not-json",
        })),
      }),
    ).rejects.toMatchObject({ kind: "invalid-body" });

    await expect(
      requestBootstrap({
        config: { anonKey: "anon", url: "https://project.supabase.co" },
        fetchImpl: jest.fn(async () => ({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ...validManifest, schemaVersion: 2 }),
        })),
      }),
    ).rejects.toMatchObject({ kind: "incompatible-schema" });
  });

  test("bounds response body reading with the same request timeout", async () => {
    jest.useFakeTimers();
    const pending = requestBootstrap({
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl: jest.fn(async () => ({
        ok: true,
        status: 200,
        text: () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve(JSON.stringify(validManifest)), 200);
          }),
      })),
      timeoutMs: 100,
    });
    const outcome = expect(pending).rejects.toMatchObject({ kind: "timeout" });

    await jest.advanceTimersByTimeAsync(200);

    await outcome;
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
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(validManifest),
      });
    const options = {
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl,
    };

    const first = loadDataBootstrap(options);
    const concurrent = loadDataBootstrap(options);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolveRequest({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(validManifest),
    });
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
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(validManifest),
      });
    const options = {
      config: { anonKey: "anon", url: "https://project.supabase.co" },
      fetchImpl,
    };

    const stale = loadDataBootstrap(options);
    invalidateDataBootstrap();
    resolveFirst({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(validManifest),
    });
    await stale;

    await loadDataBootstrap(options);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
