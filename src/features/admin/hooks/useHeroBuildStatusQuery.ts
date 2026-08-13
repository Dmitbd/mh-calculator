import { useCallback, useEffect, useRef, useState } from "react";

import type { HeroBuildSetStatusIds } from "@/features/builds";

import { AsyncRequestIdentity } from "../model/asyncRequestIdentity";

const emptyIds: HeroBuildSetStatusIds = {
  draftHeroIds: [],
  publishedHeroIds: [],
};

export function useHeroBuildStatusQuery<TClient>(params: {
  enabled: boolean;
  getClient?: () => TClient | null;
  client?: TClient | null;
  fetchIds: (client: TClient) => Promise<HeroBuildSetStatusIds>;
}) {
  const requestIdentity = useRef(new AsyncRequestIdentity());
  const [ids, setIds] = useState<HeroBuildSetStatusIds>(emptyIds);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(
    () => params.getClient ? params.getClient() : params.client ?? null,
    [params.client, params.getClient],
  );

  const load = useCallback(async (options?: {
    preserveCurrentIdsOnError?: boolean;
  }): Promise<boolean> => {
    const requestId = requestIdentity.current.begin();
    const client = getClient();

    if (!client) {
      if (!options?.preserveCurrentIdsOnError) setIds(emptyIds);
      setError("Supabase не настроен.");
      setIsLoading(false);
      requestIdentity.current.finish(requestId);
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextIds = await params.fetchIds(client);
      if (!requestIdentity.current.isCurrent(requestId)) return false;
      setIds(nextIds);
      return true;
    } catch (loadError) {
      if (!requestIdentity.current.isCurrent(requestId)) return false;
      if (!options?.preserveCurrentIdsOnError) setIds(emptyIds);
      setError(loadError instanceof Error ? loadError.message : "Неизвестная ошибка Supabase.");
      return false;
    } finally {
      if (requestIdentity.current.finish(requestId)) setIsLoading(false);
    }
  }, [getClient, params.fetchIds]);

  const reset = useCallback(() => {
    requestIdentity.current.invalidate();
    setIds(emptyIds);
    setError(null);
    setIsLoading(true);
  }, []);

  const invalidate = useCallback(() => {
    requestIdentity.current.invalidate();
  }, []);

  useEffect(() => {
    if (params.enabled) void load();
    else reset();
    return () => requestIdentity.current.invalidate();
  }, [load, params.enabled, reset]);

  return { error, ids, invalidate, isLoading, load, reset, setIds };
}
