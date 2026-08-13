export function createBoundedRequest<T>(
  request: Promise<T>,
  timeoutMs: number,
): { cancel: () => void; promise: Promise<T> } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Request timed out."));
    }, timeoutMs);
  });

  return {
    cancel,
    promise: Promise.race([request, timeout]).finally(cancel),
  };
}
