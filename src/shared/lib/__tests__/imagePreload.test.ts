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

test("does not evict an in-flight preload to start another request", async () => {
  const resolvers: Array<(loaded: boolean) => void> = [];
  const prefetch = jest.fn<Promise<boolean>, [string]>((uri) => {
    if (uri.endsWith("/c.png")) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      resolvers.push(resolve);
    });
  });
  const preloader = createBoundedImagePreloader({
    maxRegistryEntries: 2,
    prefetch,
  });

  const firstBatch = preloader.preload(["/img/a.png", "/img/b.png"]);
  await Promise.resolve();
  await preloader.preload(["/img/c.png"]);

  expect(prefetch).toHaveBeenCalledTimes(2);
  expect(preloader.registrySize()).toBe(2);

  resolvers.forEach((resolve) => resolve(true));
  await firstBatch;
  await preloader.preload(["/img/c.png"]);

  expect(prefetch).toHaveBeenCalledTimes(3);
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
