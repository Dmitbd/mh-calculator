import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

export const ICON_LOADER_DELAY_MS = 120;
export const ICON_LOADER_FINISH_MS = 400;

export type ImageLoadingPhase =
  | "missing"
  | "pending"
  | "animating"
  | "finishing-loaded"
  | "finishing-error"
  | "loaded"
  | "error";

export type ImageLoadingTransition = {
  phase: ImageLoadingPhase;
  prefersReducedMotion: boolean;
  handleLoad: (loadedUri: string) => void;
  handleError: (failedUri: string) => void;
};

type ImageLoadingState = {
  phase: ImageLoadingPhase;
  uri: string | null;
};

function createInitialState(uri: string | null): ImageLoadingState {
  return {
    phase: uri ? "pending" : "missing",
    uri,
  };
}

export function useImageLoadingTransition(
  uri: string | null,
): ImageLoadingTransition {
  const currentUri = useRef(uri);
  currentUri.current = uri;
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReceivedMotionEvent = useRef(false);
  const [state, setState] = useState<ImageLoadingState>(() =>
    createInitialState(uri),
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current !== null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);
  const clearFinishTimer = useCallback(() => {
    if (finishTimer.current !== null) {
      clearTimeout(finishTimer.current);
      finishTimer.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted && !hasReceivedMotionEvent.current) {
          setPrefersReducedMotion(isEnabled);
        }
      })
      .catch(() => {
        // Static motion is the safe fallback when the platform cannot report it.
      });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (isEnabled) => {
        hasReceivedMotionEvent.current = true;

        if (isMounted) {
          setPrefersReducedMotion(isEnabled);
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    clearShowTimer();
    clearFinishTimer();
    setState(createInitialState(uri));

    if (uri) {
      showTimer.current = setTimeout(() => {
        showTimer.current = null;
        setState((current) =>
          current.uri === uri && current.phase === "pending"
            ? { phase: "animating", uri }
            : current,
        );
      }, ICON_LOADER_DELAY_MS);
    }

    return () => {
      clearShowTimer();
      clearFinishTimer();
    };
  }, [clearFinishTimer, clearShowTimer, uri]);

  const complete = useCallback(
    (completedUri: string, result: "error" | "loaded") => {
      if (currentUri.current !== completedUri) {
        return;
      }

      clearShowTimer();
      setState((current) => {
        if (current.uri !== completedUri) {
          return current;
        }

        if (current.phase === "pending") {
          return { phase: result, uri: completedUri };
        }

        if (current.phase !== "animating") {
          return current;
        }

        clearFinishTimer();
        finishTimer.current = setTimeout(() => {
          finishTimer.current = null;
          setState((finishing) =>
            finishing.uri === completedUri &&
            finishing.phase === `finishing-${result}`
              ? { phase: result, uri: completedUri }
              : finishing,
          );
        }, ICON_LOADER_FINISH_MS);

        return { phase: `finishing-${result}`, uri: completedUri };
      });
    },
    [clearFinishTimer, clearShowTimer],
  );

  const effectiveState = state.uri === uri ? state : createInitialState(uri);

  return {
    phase: effectiveState.phase,
    prefersReducedMotion,
    handleLoad: (loadedUri) => complete(loadedUri, "loaded"),
    handleError: (failedUri) => complete(failedUri, "error"),
  };
}
