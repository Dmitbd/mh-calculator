import {
  acceptBootstrap,
  acceptResource,
  beginBootstrap,
  beginResource,
  createSourceSelectionState,
  rejectBootstrap,
  rejectResource,
} from "../model/sourceSelection";

const manifest = {
  status: "ok" as const,
  contentVersion: "v1",
  contentUpdatedAt: "1970-01-01T00:00:00.000000Z",
  schemaVersion: 1 as const,
  resources: {
    heroBuilds: { version: "v1", etag: `sha256:${"a".repeat(64)}` },
  },
};

describe("source selection state machine", () => {
  test("moves checking bootstrap to remote with a compatible manifest", () => {
    const state = createSourceSelectionState({ heroBuilds: ["bundled"] });

    expect(acceptBootstrap(state, manifest).bootstrap).toEqual({
      error: null,
      isRefreshing: false,
      manifest,
      source: "remote",
    });
  });

  test("moves initial bootstrap failure to fallback", () => {
    const state = createSourceSelectionState({ heroBuilds: ["bundled"] });

    expect(rejectBootstrap(state, "timeout").bootstrap).toMatchObject({
      error: "timeout",
      isRefreshing: false,
      source: "fallback",
    });
  });

  test("keeps accepted data visible while bootstrap retries", () => {
    const initial = createSourceSelectionState({ heroBuilds: ["bundled"] });
    const accepted = acceptResource(
      acceptBootstrap(initial, manifest),
      "heroBuilds",
      ["remote"],
    );

    const retrying = beginBootstrap(accepted);

    expect(retrying.resources.heroBuilds).toMatchObject({
      data: ["remote"],
      source: "remote",
    });
    expect(retrying.bootstrap.isRefreshing).toBe(true);

    const failedRetry = rejectBootstrap(retrying, "network");
    expect(failedRetry.resources.heroBuilds).toMatchObject({
      data: ["remote"],
      source: "remote",
    });
  });

  test("falls back only the failed resource", () => {
    const initial = acceptBootstrap(
      createSourceSelectionState({
        heroBuilds: ["bundled-builds"],
        heroCatalog: ["bundled-catalog"],
      }),
      manifest,
    );
    const withCatalog = acceptResource(
      initial,
      "heroCatalog",
      ["remote-catalog"],
    );
    const loadingBuilds = beginResource(withCatalog, "heroBuilds");
    const failedBuilds = rejectResource(loadingBuilds, "heroBuilds", "network");

    expect(failedBuilds.resources.heroBuilds).toMatchObject({
      data: ["bundled-builds"],
      error: "network",
      source: "fallback",
    });
    expect(failedBuilds.resources.heroCatalog).toMatchObject({
      data: ["remote-catalog"],
      error: null,
      source: "remote",
    });
  });

  test("preserves already accepted resource data after refresh failure", () => {
    const initial = createSourceSelectionState({ heroBuilds: ["bundled"] });
    const accepted = acceptResource(initial, "heroBuilds", ["remote"]);
    const failed = rejectResource(
      beginResource(accepted, "heroBuilds"),
      "heroBuilds",
      "network",
    );

    expect(failed.resources.heroBuilds).toEqual({
      data: ["remote"],
      error: "network",
      isRefreshing: false,
      source: "remote",
    });
  });
});
