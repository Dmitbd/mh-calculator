import type {
  BootstrapFallbackReason,
  DataBootstrapManifest,
} from "./dataBootstrap";

export type ResourceFallbackReason =
  | BootstrapFallbackReason
  | "conflict"
  | "invalid-data"
  | "no-data";

export type ResourceSourceState<T> = {
  data: T | null;
  error: ResourceFallbackReason | null;
  isRefreshing: boolean;
  source: "checking" | "fallback" | "remote";
};

export type SourceSelectionState<TResources extends Record<string, unknown>> = {
  bootstrap: {
    error: BootstrapFallbackReason | null;
    isRefreshing: boolean;
    manifest: DataBootstrapManifest | null;
    source: "checking" | "fallback" | "remote";
  };
  fallbacks: TResources;
  resources: {
    [TKey in keyof TResources]: ResourceSourceState<TResources[TKey]>;
  };
};

export function createSourceSelectionState<
  TResources extends Record<string, unknown>,
>(fallbacks: TResources): SourceSelectionState<TResources> {
  const resources = Object.keys(fallbacks).reduce((result, key) => {
    result[key] = {
      data: null,
      error: null,
      isRefreshing: false,
      source: "checking",
    };
    return result;
  }, {} as Record<string, ResourceSourceState<unknown>>);

  return {
    bootstrap: {
      error: null,
      isRefreshing: false,
      manifest: null,
      source: "checking",
    },
    fallbacks,
    resources: resources as SourceSelectionState<TResources>["resources"],
  };
}

export function beginBootstrap<TResources extends Record<string, unknown>>(
  state: SourceSelectionState<TResources>,
): SourceSelectionState<TResources> {
  return {
    ...state,
    bootstrap: {
      ...state.bootstrap,
      error: null,
      isRefreshing: state.bootstrap.source !== "checking",
    },
  };
}

export function acceptBootstrap<TResources extends Record<string, unknown>>(
  state: SourceSelectionState<TResources>,
  manifest: DataBootstrapManifest,
): SourceSelectionState<TResources> {
  return {
    ...state,
    bootstrap: {
      error: null,
      isRefreshing: false,
      manifest,
      source: "remote",
    },
  };
}

export function rejectBootstrap<TResources extends Record<string, unknown>>(
  state: SourceSelectionState<TResources>,
  error: BootstrapFallbackReason,
): SourceSelectionState<TResources> {
  return {
    ...state,
    bootstrap: {
      error,
      isRefreshing: false,
      manifest: null,
      source: "fallback",
    },
  };
}

export function beginResource<
  TResources extends Record<string, unknown>,
  TKey extends keyof TResources,
>(
  state: SourceSelectionState<TResources>,
  key: TKey,
): SourceSelectionState<TResources> {
  const current = state.resources[key];
  return replaceResource(state, key, {
    ...current,
    error: null,
    isRefreshing: current.data !== null,
    source: current.data === null ? "checking" : current.source,
  });
}

export function acceptResource<
  TResources extends Record<string, unknown>,
  TKey extends keyof TResources,
>(
  state: SourceSelectionState<TResources>,
  key: TKey,
  data: TResources[TKey],
): SourceSelectionState<TResources> {
  return replaceResource(state, key, {
    data,
    error: null,
    isRefreshing: false,
    source: "remote",
  });
}

export function rejectResource<
  TResources extends Record<string, unknown>,
  TKey extends keyof TResources,
>(
  state: SourceSelectionState<TResources>,
  key: TKey,
  error: ResourceFallbackReason,
): SourceSelectionState<TResources> {
  const current = state.resources[key];
  return replaceResource(state, key, {
    data: current.data ?? state.fallbacks[key],
    error,
    isRefreshing: false,
    source: current.data === null ? "fallback" : current.source,
  });
}

function replaceResource<
  TResources extends Record<string, unknown>,
  TKey extends keyof TResources,
>(
  state: SourceSelectionState<TResources>,
  key: TKey,
  resource: ResourceSourceState<TResources[TKey]>,
): SourceSelectionState<TResources> {
  return {
    ...state,
    resources: {
      ...state.resources,
      [key]: resource,
    },
  };
}
