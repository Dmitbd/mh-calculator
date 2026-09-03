import { useEffect, useRef, useState } from "react";

import type { AdminSession } from "@/features/auth";
import { AsyncRequestIdentity } from "../model/asyncRequestIdentity";

export function useAdminSessionGate<TClient>(params: {
  initialSession?: AdminSession | null;
  getClient: () => TClient | null;
  restore: (client: TClient) => Promise<AdminSession | null>;
}) {
  const requestIdentity = useRef(new AsyncRequestIdentity());
  const [session, setSession] = useState<AdminSession | null>(
    params.initialSession ?? null,
  );
  const [isChecked, setIsChecked] = useState(params.initialSession !== undefined);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (params.initialSession !== undefined) return;
    const client = params.getClient();
    if (!client) {
      setIsChecked(true);
      return;
    }

    const requestId = requestIdentity.current.begin();
    void params.restore(client)
      .then((restoredSession) => {
        if (!requestIdentity.current.isCurrent(requestId)) return;
        setSession(restoredSession);
        setIsChecked(true);
      })
      .catch((error) => {
        if (!requestIdentity.current.isCurrent(requestId)) return;
        setRestoreError(
          error instanceof Error ? `Ошибка Supabase: ${error.message}` : "Ошибка Supabase.",
        );
        setIsChecked(true);
      })
      .finally(() => requestIdentity.current.finish(requestId));

    return () => requestIdentity.current.invalidate();
  }, [params.getClient, params.initialSession, params.restore]);

  return { isChecked, restoreError, session, setSession };
}
