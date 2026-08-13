export class BoundedRequestCancelledError extends Error {
  readonly code = "BOUNDED_REQUEST_CANCELLED" as const;

  constructor() {
    super("Bounded request cancelled.");
    this.name = "BoundedRequestCancelledError";
  }
}

export function isBoundedRequestCancelledError(
  error: unknown,
): error is BoundedRequestCancelledError {
  return error instanceof BoundedRequestCancelledError;
}

type BoundedRequestOutcome<T> =
  | { kind: "resolve"; value: T }
  | { kind: "reject"; reason: unknown };

type RequestObserver<T> = {
  current: ((outcome: BoundedRequestOutcome<T>) => void) | null;
};

function observeRequest<T>(request: Promise<T>, observer: RequestObserver<T>) {
  void request.then(
    (value) => observer.current?.({ kind: "resolve", value }),
    (reason: unknown) => observer.current?.({ kind: "reject", reason }),
  );
}

export function createBoundedRequest<T>(
  request: Promise<T>,
  timeoutMs: number,
): { cancel: () => void; promise: Promise<T> } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isSettled = false;
  let resolveBounded!: (value: T) => void;
  let rejectBounded!: (reason: unknown) => void;
  const requestObserver: RequestObserver<T> = { current: null };

  const clearTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const settle = (outcome: BoundedRequestOutcome<T>) => {
    if (isSettled) {
      return;
    }

    isSettled = true;
    requestObserver.current = null;
    clearTimer();

    if (outcome.kind === "resolve") {
      resolveBounded(outcome.value);
    } else {
      rejectBounded(outcome.reason);
    }
  };

  const promise = new Promise<T>((resolve, reject) => {
    resolveBounded = resolve;
    rejectBounded = reject;
  });

  requestObserver.current = settle;
  observeRequest(request, requestObserver);

  timeoutId = setTimeout(() => {
    settle({ kind: "reject", reason: new Error("Request timed out.") });
  }, timeoutMs);

  return {
    cancel: () => {
      settle({ kind: "reject", reason: new BoundedRequestCancelledError() });
    },
    promise,
  };
}
