import { HeroBuildSetRepositoryError } from "@/features/builds";

import {
  BuilderRevisionStore,
  runBuilderDraftCommand,
  runBuilderPublishCommand,
  runBuilderServerCommand,
  runBuilderUpdateCommand,
} from "../api/builderServerCommands";

describe("builderServerCommands", () => {
  it("returns the authoritative revision from a successful command", async () => {
    await expect(
      runBuilderServerCommand({
        fallbackRevision: 4,
        run: async () => ({ revision: 9 }),
      }),
    ).resolves.toEqual({ kind: "success", revision: 9 });
  });

  it("maps optimistic conflicts without discarding the retry boundary", async () => {
    const error = new HeroBuildSetRepositoryError("conflict", "conflict");

    await expect(
      runBuilderServerCommand({ fallbackRevision: 4, run: async () => { throw error; } }),
    ).resolves.toEqual({ kind: "conflict", error });
  });

  it("keeps accepted revisions until the owning session explicitly clears them", () => {
    const revisions = new BuilderRevisionStore();
    revisions.set("bastet", 7);

    expect(revisions.get("bastet")).toBe(7);
    revisions.set("bastet", null);
    expect(revisions.get("bastet")).toBeNull();
    revisions.set("bastet", 8);
    revisions.clear();
    expect(revisions.get("bastet")).toBeNull();
  });

  it("routes draft, publish and update through explicit typed commands", async () => {
    const buildSet = {} as never;
    const client = {} as never;
    const createDraft = jest.fn().mockResolvedValue({ revision: 2 });
    const publishDraft = jest.fn().mockResolvedValue({ revision: 3 });
    const updatePublished = jest.fn().mockResolvedValue({ revision: 4 });

    await expect(runBuilderDraftCommand({ buildSet, client, expectedRevision: 1, heroId: "bastet", run: createDraft })).resolves.toEqual({ kind: "success", revision: 2 });
    await expect(runBuilderPublishCommand({ buildSet, client, expectedRevision: 2, heroId: "bastet", run: publishDraft })).resolves.toEqual({ kind: "success", revision: 3 });
    await expect(runBuilderUpdateCommand({ buildSet, client, expectedRevision: 3, heroId: "bastet", run: updatePublished })).resolves.toEqual({ kind: "success", revision: 4 });
  });
});
