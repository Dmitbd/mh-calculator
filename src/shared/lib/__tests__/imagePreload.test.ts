jest.mock("@/shared/lib/resolveAssetUri", () => ({
  __esModule: true,
  resolveAssetUri: (path: string) => `resolved:${path}`,
}));

import {
  createBoundedImagePreloader,
  CRITICAL_IMAGE_PRELOAD_TIMEOUT_MS,
} from "../imagePreload";
import { useCriticalImagePreload } from "../imagePreload";
import { act, render, screen } from "@testing-library/react-native";
import { Image, Text } from "react-native";
import { createElement } from "react";

function ReadinessProbe({
  preserve = false,
  readinessKey = "default",
  source,
}: {
  preserve?: boolean;
  readinessKey?: string;
  source: string;
}) {
  const ready = useCriticalImagePreload([source], {
    readinessKey,
    resetOnReadinessKeyChange: !preserve,
  });

  return createElement(Text, null, ready ? "ready" : "loading");
}

async function flushMicrotasks() {
  for (let step = 0; step < 6; step += 1) {
    await Promise.resolve();
  }
}

test("deduplicates a critical batch and respects its per-screen limit", async () => {
  const prefetch = jest.fn<Promise<boolean>, [string]>(async () => true);
  const preloader = createBoundedImagePreloader({
    maxRegistryEntries: 8,
    prefetch,
  });

  await preloader.preload(
    ["/img/a.png", "/img/a.png", "", "/img/b.png", "/img/c.png"],
    2,
  );

  expect(prefetch).toHaveBeenCalledTimes(2);
  expect(prefetch).toHaveBeenNthCalledWith(1, "resolved:/img/a.png");
  expect(prefetch).toHaveBeenNthCalledWith(2, "resolved:/img/b.png");
});

test("deduplicates completed work while keeping the registry bounded", async () => {
  const prefetch = jest.fn<Promise<boolean>, [string]>(async () => true);
  const preloader = createBoundedImagePreloader({
    maxRegistryEntries: 2,
    prefetch,
  });

  await preloader.preload(["/img/a.png", "/img/b.png"]);
  await preloader.preload(["/img/a.png", "/img/c.png"]);

  expect(prefetch.mock.calls.map(([uri]) => uri)).toEqual([
    "resolved:/img/a.png",
    "resolved:/img/b.png",
    "resolved:/img/c.png",
  ]);
  expect(preloader.registrySize()).toBe(2);
});

test("allows a failed preload to be retried", async () => {
  const prefetch = jest
    .fn<Promise<boolean>, [string]>()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const preloader = createBoundedImagePreloader({
    maxRegistryEntries: 2,
    prefetch,
  });

  await preloader.preload(["/img/a.png"]);
  await preloader.preload(["/img/a.png"]);

  expect(prefetch).toHaveBeenCalledTimes(2);
});

test("keeps a successful web prefetch that resolves without a value", async () => {
  const prefetch = jest.fn<Promise<void>, [string]>(async () => undefined);
  const preloader = createBoundedImagePreloader({ prefetch });

  await preloader.preload(["/img/a.png"]);
  await preloader.preload(["/img/a.png"]);

  expect(prefetch).toHaveBeenCalledTimes(1);
  expect(preloader.registrySize()).toBe(1);
});

test("waits for a registry slot and deduplicates concurrent queued requests", async () => {
  const resolvers = new Map<string, (loaded?: boolean) => void>();
  const prefetch = jest.fn<Promise<boolean | void>, [string]>((uri) =>
    new Promise((resolve) => {
      resolvers.set(uri, resolve);
    }),
  );
  const preloader = createBoundedImagePreloader({
    maxRegistryEntries: 2,
    prefetch,
  });

  const firstBatch = preloader.preload(["/img/a.png", "/img/b.png"]);
  await flushMicrotasks();
  const firstQueuedCaller = preloader.preload(["/img/c.png"]);
  const secondQueuedCaller = preloader.preload(["/img/c.png"]);
  let firstQueuedCallerSettled = false;
  void firstQueuedCaller.then(() => {
    firstQueuedCallerSettled = true;
  });
  await flushMicrotasks();

  expect(prefetch).toHaveBeenCalledTimes(2);
  expect(preloader.registrySize()).toBe(2);
  expect(firstQueuedCallerSettled).toBe(false);

  resolvers.get("resolved:/img/a.png")?.(true);
  await flushMicrotasks();

  expect(prefetch).toHaveBeenCalledTimes(3);
  expect(prefetch).toHaveBeenLastCalledWith("resolved:/img/c.png");
  expect(firstQueuedCallerSettled).toBe(false);
  expect(preloader.registrySize()).toBe(2);

  resolvers.get("resolved:/img/c.png")?.();
  await Promise.all([firstQueuedCaller, secondQueuedCaller]);

  expect(
    prefetch.mock.calls.filter(([uri]) => uri.endsWith("/c.png")),
  ).toHaveLength(1);

  resolvers.get("resolved:/img/b.png")?.(true);
  await firstBatch;
});

test("uses a failed request slot for a queued URL and keeps failure retryable", async () => {
  const attempts = new Map<string, number>();
  let rejectFirst!: (error: Error) => void;
  const prefetch = jest.fn<Promise<boolean>, [string]>((uri) => {
    attempts.set(uri, (attempts.get(uri) ?? 0) + 1);

    if (uri.endsWith("/a.png") && attempts.get(uri) === 1) {
      return new Promise((_resolve, reject) => {
        rejectFirst = reject;
      });
    }

    return Promise.resolve(true);
  });
  const preloader = createBoundedImagePreloader({
    maxRegistryEntries: 1,
    prefetch,
  });

  const failedRequest = preloader.preload(["/img/a.png"]);
  await flushMicrotasks();
  const queuedRequest = preloader.preload(["/img/c.png"]);

  expect(prefetch).toHaveBeenCalledTimes(1);

  rejectFirst(new Error("prefetch failed"));
  await Promise.all([failedRequest, queuedRequest]);

  expect(prefetch.mock.calls.map(([uri]) => uri)).toEqual([
    "resolved:/img/a.png",
    "resolved:/img/c.png",
  ]);

  await preloader.preload(["/img/a.png"]);

  expect(prefetch).toHaveBeenLastCalledWith("resolved:/img/a.png");
  expect(attempts.get("resolved:/img/a.png")).toBe(2);
});

test("reports readiness only after the critical preload attempt settles", async () => {
  let resolvePrefetch!: (loaded: boolean) => void;
  jest.spyOn(Image, "prefetch").mockReturnValue(
    new Promise((resolve) => {
      resolvePrefetch = resolve;
    }),
  );

  render(createElement(ReadinessProbe, { source: "/img/readiness-probe.png" }));

  expect(screen.getByText("loading")).toBeTruthy();

  await act(async () => {
    resolvePrefetch(true);
  });

  expect(screen.getByText("ready")).toBeTruthy();
});

test("releases the readiness gate when a platform prefetch never settles", async () => {
  jest.useFakeTimers();
  jest.spyOn(Image, "prefetch").mockReturnValue(new Promise(() => undefined));

  render(createElement(ReadinessProbe, { source: "/img/readiness-timeout.png" }));

  expect(screen.getByText("loading")).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(CRITICAL_IMAGE_PRELOAD_TIMEOUT_MS);
  });

  expect(screen.getByText("ready")).toBeTruthy();
  jest.useRealTimers();
});

test("cancels the readiness timeout immediately on unmount", () => {
  jest.useFakeTimers();
  jest.spyOn(Image, "prefetch").mockReturnValue(new Promise(() => undefined));

  const view = render(
    createElement(ReadinessProbe, { source: "/img/readiness-unmount.png" }),
  );

  expect(jest.getTimerCount()).toBe(1);

  view.unmount();

  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

test("preserves readiness while a background source change preloads", async () => {
  let resolveBackground!: (loaded: boolean) => void;
  jest
    .spyOn(Image, "prefetch")
    .mockResolvedValueOnce(true)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBackground = resolve;
      }),
    );
  const view = render(
    createElement(ReadinessProbe, {
      preserve: true,
      readinessKey: "fallback",
      source: "/img/preserve-first.png",
    }),
  );

  expect(await screen.findByText("ready")).toBeTruthy();

  view.rerender(
    createElement(ReadinessProbe, {
      preserve: true,
      readinessKey: "remote",
      source: "/img/preserve-background.png",
    }),
  );

  expect(screen.getByText("ready")).toBeTruthy();

  await act(async () => {
    resolveBackground(true);
  });
});
