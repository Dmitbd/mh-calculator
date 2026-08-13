import { readSupabaseConfig, type SupabaseConfig } from "./supabaseConfig";

export const DATA_BOOTSTRAP_SCHEMA_VERSION = 1 as const;
export const DATA_BOOTSTRAP_TIMEOUT_MS = 8_000;

const MAX_BODY_LENGTH = 32 * 1024;
const MAX_CONTENT_VERSION_LENGTH = 128;
const MAX_RESOURCE_COUNT = 16;
const MAX_RESOURCE_NAME_LENGTH = 64;
const MAX_RESOURCE_VERSION_LENGTH = 128;
const SHA256_ETAG_PATTERN = /^sha256:[a-f0-9]{64}$/;
const RESOURCE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;

export type BootstrapResourceManifest = {
  etag: string;
  version: string;
};

export type DataBootstrapManifest = {
  contentVersion: string;
  resources: Record<string, BootstrapResourceManifest> & {
    heroBuilds: BootstrapResourceManifest;
  };
  schemaVersion: typeof DATA_BOOTSTRAP_SCHEMA_VERSION;
  status: "ok";
};

export type BootstrapFallbackReason =
  | "http"
  | "incompatible-schema"
  | "invalid-body"
  | "network"
  | "not-configured"
  | "timeout";

export class BootstrapRequestError extends Error {
  readonly cause: unknown;
  readonly kind: Exclude<BootstrapFallbackReason, "not-configured">;

  constructor(
    kind: Exclude<BootstrapFallbackReason, "not-configured">,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "BootstrapRequestError";
    this.kind = kind;
    this.cause = cause;
  }
}

type BootstrapResponse = {
  body?: ReadableStream<Uint8Array> | null;
  headers: { get: (name: string) => string | null };
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

type BootstrapFetch = (
  input: string,
  init: {
    headers: Record<string, string>;
    method: "GET";
    signal: AbortSignal;
  },
) => Promise<BootstrapResponse>;

export type RequestBootstrapOptions = {
  config: SupabaseConfig;
  fetchImpl?: BootstrapFetch;
  timeoutMs?: number;
};

export type DataBootstrapDecision =
  | { manifest: DataBootstrapManifest; reason: null; source: "remote" }
  | {
      manifest: null;
      reason: BootstrapFallbackReason;
      source: "fallback";
    };

export type LoadDataBootstrapOptions = {
  config?: SupabaseConfig | null;
  fetchImpl?: BootstrapFetch;
  force?: boolean;
  timeoutMs?: number;
};

let cachedRemoteDecision:
  | { cacheKey: string; decision: DataBootstrapDecision }
  | null = null;
let inFlight:
  | { cacheKey: string; promise: Promise<DataBootstrapDecision> }
  | null = null;
let cacheGeneration = 0;

export function invalidateDataBootstrap(): void {
  cacheGeneration += 1;
  cachedRemoteDecision = null;
  inFlight = null;
}

export async function requestBootstrap({
  config,
  fetchImpl = globalThis.fetch as BootstrapFetch,
  timeoutMs = DATA_BOOTSTRAP_TIMEOUT_MS,
}: RequestBootstrapOptions): Promise<DataBootstrapManifest> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new BootstrapRequestError("timeout", "Bootstrap timeout must be positive.");
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new BootstrapRequestError("timeout", "Bootstrap request timed out."));
    }, timeoutMs);
  });
  const endpoint = `${config.url.replace(/\/+$/, "")}/functions/v1/bootstrap`;

  try {
    const request = async () => {
      const response = await fetchImpl(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.anonKey}`,
          apikey: config.anonKey,
        },
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BootstrapRequestError(
          "http",
          `Bootstrap request failed with HTTP ${response.status}.`,
        );
      }

      const text = await readBoundedResponseText(response);

      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch (error) {
        throw new BootstrapRequestError(
          "invalid-body",
          "Bootstrap response is not valid JSON.",
          error,
        );
      }

      return parseBootstrapManifest(body);
    };

    return await Promise.race([request(), timeout]);
  } catch (error) {
    if (error instanceof BootstrapRequestError) {
      throw error;
    }

    throw new BootstrapRequestError(
      "network",
      "Bootstrap request failed.",
      error,
    );
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

async function readBoundedResponseText(
  response: BootstrapResponse,
): Promise<string> {
  if (!response.body) {
    const contentLengthHeader = response.headers.get("Content-Length");
    if (
      contentLengthHeader === null ||
      !/^\d+$/.test(contentLengthHeader)
    ) {
      throw new BootstrapRequestError(
        "invalid-body",
        "Bootstrap response requires a valid Content-Length.",
      );
    }
    const declaredByteLength = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(declaredByteLength) ||
      declaredByteLength > MAX_BODY_LENGTH
    ) {
      throw new BootstrapRequestError(
        "invalid-body",
        "Bootstrap response exceeds its size budget.",
      );
    }
    const text = await response.text();
    const actualByteLength = new TextEncoder().encode(text).byteLength;
    if (
      actualByteLength > MAX_BODY_LENGTH ||
      actualByteLength !== declaredByteLength
    ) {
      throw new BootstrapRequestError(
        "invalid-body",
        "Bootstrap response length does not match Content-Length.",
      );
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_LENGTH) {
        try {
          await reader.cancel("Bootstrap response exceeds its size budget.");
        } catch {
          // The size violation remains authoritative even if transport cleanup fails.
        }
        throw new BootstrapRequestError(
          "invalid-body",
          "Bootstrap response exceeds its size budget.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export function parseBootstrapManifest(value: unknown): DataBootstrapManifest {
  try {
    const root = readExactObject(value, [
      "status",
      "contentVersion",
      "schemaVersion",
      "resources",
    ]);
    const status = root.status;
    const contentVersion = readBoundedString(
      root.contentVersion,
      "contentVersion",
      MAX_CONTENT_VERSION_LENGTH,
    );
    const schemaVersion = root.schemaVersion;

    if (status !== "ok") {
      throw new Error("status must equal ok");
    }
    if (!Number.isSafeInteger(schemaVersion) || (schemaVersion as number) < 1) {
      throw new Error("schemaVersion must be a positive integer");
    }
    if (schemaVersion !== DATA_BOOTSTRAP_SCHEMA_VERSION) {
      throw new BootstrapRequestError(
        "incompatible-schema",
        `Unsupported bootstrap schema version ${String(schemaVersion)}.`,
      );
    }

    const resourceObject = readBoundedObject(root.resources, "resources");
    const resourceNames = Reflect.ownKeys(resourceObject);
    if (resourceNames.length === 0 || resourceNames.length > MAX_RESOURCE_COUNT) {
      throw new Error(`resources must contain 1..${MAX_RESOURCE_COUNT} entries`);
    }

    const resources: Record<string, BootstrapResourceManifest> = {};
    for (const resourceName of resourceNames) {
      if (
        typeof resourceName !== "string" ||
        resourceName.length > MAX_RESOURCE_NAME_LENGTH ||
        !RESOURCE_NAME_PATTERN.test(resourceName)
      ) {
        throw new Error("resource name is invalid");
      }

      const descriptor = Object.getOwnPropertyDescriptor(resourceObject, resourceName);
      if (!descriptor || !("value" in descriptor)) {
        throw new Error(`resources.${resourceName} must be a data property`);
      }
      const resource = readExactObject(descriptor.value, ["version", "etag"]);
      const version = readBoundedString(
        resource.version,
        `resources.${resourceName}.version`,
        MAX_RESOURCE_VERSION_LENGTH,
      );
      const etag = readBoundedString(
        resource.etag,
        `resources.${resourceName}.etag`,
        71,
      );
      if (!SHA256_ETAG_PATTERN.test(etag)) {
        throw new Error(`resources.${resourceName}.etag must be a SHA-256 etag`);
      }
      resources[resourceName] = { etag, version };
    }

    if (!Object.prototype.hasOwnProperty.call(resources, "heroBuilds")) {
      throw new Error("resources.heroBuilds is required");
    }

    return {
      contentVersion,
      resources: resources as DataBootstrapManifest["resources"],
      schemaVersion: DATA_BOOTSTRAP_SCHEMA_VERSION,
      status: "ok",
    };
  } catch (error) {
    if (error instanceof BootstrapRequestError) {
      throw error;
    }
    throw new BootstrapRequestError(
      "invalid-body",
      error instanceof Error ? error.message : "Invalid bootstrap response.",
      error,
    );
  }
}

export function loadDataBootstrap(
  options: LoadDataBootstrapOptions = {},
): Promise<DataBootstrapDecision> {
  const config = options.config === undefined ? readSupabaseConfig() : options.config;
  if (!config) {
    return Promise.resolve({
      manifest: null,
      reason: "not-configured",
      source: "fallback",
    });
  }

  const cacheKey = `${config.url}\n${config.anonKey}`;
  if (inFlight?.cacheKey === cacheKey) {
    return inFlight.promise;
  }
  if (!options.force && cachedRemoteDecision?.cacheKey === cacheKey) {
    return Promise.resolve(cachedRemoteDecision.decision);
  }
  if (options.force) {
    cacheGeneration += 1;
    cachedRemoteDecision = null;
  }
  const requestGeneration = cacheGeneration;

  const promise = requestBootstrap({
    config,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  })
    .then<DataBootstrapDecision>((manifest) => {
      const decision: DataBootstrapDecision = {
        manifest,
        reason: null,
        source: "remote",
      };
      if (requestGeneration === cacheGeneration) {
        cachedRemoteDecision = { cacheKey, decision };
      }
      return decision;
    })
    .catch<DataBootstrapDecision>((error: unknown) => ({
      manifest: null,
      reason:
        error instanceof BootstrapRequestError ? error.kind : "network",
      source: "fallback",
    }))
    .finally(() => {
      if (inFlight?.promise === promise) {
        inFlight = null;
      }
    });

  inFlight = { cacheKey, promise };
  return promise;
}

function readExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  const object = readBoundedObject(value, "value");
  const keys = Reflect.ownKeys(object);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !expectedKeys.includes(key),
    )
  ) {
    throw new Error("object fields do not match the bootstrap contract");
  }

  return expectedKeys.reduce<Record<string, unknown>>((result, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new Error(`${key} must be an own data property`);
    }
    result[key] = descriptor.value;
    return result;
  }, {});
}

function readBoundedObject(value: unknown, path: string): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${path} must be a plain object`);
  }
  return value;
}

function readBoundedString(
  value: unknown,
  path: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    throw new Error(`${path} must be a bounded non-empty string`);
  }
  return value;
}
