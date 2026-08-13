import { useEffect, useState } from "react";
import { Image } from "react-native";

import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

export const CRITICAL_IMAGE_PRELOAD_LIMIT = 24;
export const CRITICAL_IMAGE_PRELOAD_TIMEOUT_MS = 3_000;
const DEFAULT_PRELOAD_REGISTRY_LIMIT = 32;

type ImagePreloaderOptions = {
  maxRegistryEntries?: number;
  prefetch?: (uri: string) => Promise<boolean | void>;
};

type CriticalImagePreloadOptions = {
  enabled?: boolean;
  resetOnReadinessKeyChange?: boolean;
  readinessKey?: string;
};

export type BoundedImagePreloader = {
  preload: (sources: readonly string[], limit?: number) => Promise<void>;
  registrySize: () => number;
};

type PreloadRegistryEntry = {
  request: Promise<boolean>;
  settled: boolean;
};

/** Creates a bounded active/cache registry with deduplicated slot waiting. */
export function createBoundedImagePreloader({
  maxRegistryEntries = DEFAULT_PRELOAD_REGISTRY_LIMIT,
  prefetch = (uri) => Image.prefetch(uri),
}: ImagePreloaderOptions = {}): BoundedImagePreloader {
  const registry = new Map<string, PreloadRegistryEntry>();
  const queuedRequests = new Map<string, Promise<boolean>>();
  const registryLimit = Math.max(1, maxRegistryEntries);

  const startRequest = (uri: string): Promise<boolean> => {
    let entry!: PreloadRegistryEntry;
    const request = Promise.resolve()
      .then(() => prefetch(uri))
      .then((loaded) => {
        if (loaded === false) {
          registry.delete(uri);
        } else {
          entry.settled = true;
        }

        return loaded !== false;
      })
      .catch(() => {
        registry.delete(uri);
        return false;
      });

    entry = { request, settled: false };
    registry.set(uri, entry);
    return request;
  };

  const preloadUri = (uri: string): Promise<boolean> => {
    const registered = registry.get(uri);

    if (registered) {
      return registered.request;
    }

    const queued = queuedRequests.get(uri);

    if (queued) {
      return queued;
    }

    const queuedRequest = (async () => {
      while (registry.size >= registryLimit) {
        const oldestSettledUri = Array.from(registry.entries()).find(
          ([, entry]) => entry.settled,
        )?.[0];

        if (oldestSettledUri) {
          registry.delete(oldestSettledUri);
          break;
        }

        await Promise.race(
          Array.from(registry.values(), (entry) => entry.request),
        );
      }

      const requestStartedWhileWaiting = registry.get(uri);
      return requestStartedWhileWaiting?.request ?? startRequest(uri);
    })();

    queuedRequests.set(uri, queuedRequest);
    void queuedRequest.then(() => {
      if (queuedRequests.get(uri) === queuedRequest) {
        queuedRequests.delete(uri);
      }
    });
    return queuedRequest;
  };

  const preload = async (
    sources: readonly string[],
    limit = CRITICAL_IMAGE_PRELOAD_LIMIT,
  ): Promise<void> => {
    const uniqueUris = Array.from(
      new Set(sources.filter(Boolean).map((source) => resolveAssetUri(source))),
    ).slice(0, Math.max(0, limit));
    await Promise.all(uniqueUris.map(preloadUri));
  };

  return {
    preload,
    registrySize: () => registry.size,
  };
}

const criticalImagePreloader = createBoundedImagePreloader();

/**
 * Preloads a bounded above-fold set and exposes an initial readiness gate.
 * Once a readiness key completes, background source changes preserve content.
 */
export function useCriticalImagePreload(
  sources: readonly string[],
  {
    enabled = true,
    resetOnReadinessKeyChange = true,
    readinessKey = "default",
  }: CriticalImagePreloadOptions = {},
): boolean {
  const [completedReadinessKey, setCompletedReadinessKey] = useState<
    string | null
  >(null);
  const sourceKey = sources.join("\u0000");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let releaseTimeout!: () => void;
    const timeout = new Promise<void>((resolve) => {
      releaseTimeout = resolve;
      timeoutId = setTimeout(resolve, CRITICAL_IMAGE_PRELOAD_TIMEOUT_MS);
    });
    const clearReadinessTimeout = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    void Promise.race([criticalImagePreloader.preload(sources), timeout])
      .then(() => {
        if (active) {
          setCompletedReadinessKey(readinessKey);
        }
      })
      .finally(() => {
        clearReadinessTimeout();
      });

    return () => {
      active = false;
      clearReadinessTimeout();
      releaseTimeout();
    };
  }, [enabled, readinessKey, sourceKey]);

  return (
    enabled &&
    (resetOnReadinessKeyChange
      ? completedReadinessKey === readinessKey
      : completedReadinessKey !== null)
  );
}
