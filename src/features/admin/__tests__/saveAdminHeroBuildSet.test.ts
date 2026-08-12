import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import { getHeroBuildSet } from "@/features/game-data/heroes";

import { publishDraftHeroBuildSet } from "@/features/builds";
import {
  hasCreatePublicationConflict,
  publishAdminHeroBuildSet,
} from "../api/saveAdminHeroBuildSet";

jest.mock("@/features/builds", () => ({
  publishDraftHeroBuildSet: jest.fn(),
}));

const mockedPublishDraft = jest.mocked(publishDraftHeroBuildSet);
const buildSet: HeroBuildSet = { schemaVersion: 2, tabs: [] };
const client = { from: jest.fn() } as never;

beforeEach(() => {
  mockedPublishDraft.mockReset();
});

it("publishes the matching expected draft revision in one operation", async () => {
  let resolvePublication!: (value: { revision: number }) => void;
  mockedPublishDraft.mockReturnValue(
    new Promise((resolve) => {
      resolvePublication = resolve;
    }) as never,
  );

  const publication = publishAdminHeroBuildSet({
    buildSet,
    client,
    expectedRevision: 4,
    heroId: "bastet",
  });

  expect(mockedPublishDraft).toHaveBeenCalledWith(client, {
    buildSet,
    expectedRevision: 4,
    heroId: "bastet",
  });

  resolvePublication({ revision: 5 });

  await expect(publication).resolves.toMatchObject({ revision: 5 });
});

it("surfaces an atomic publication failure", async () => {
  mockedPublishDraft.mockRejectedValue(new Error("publish failed"));

  await expect(
    publishAdminHeroBuildSet({
      buildSet,
      client,
      expectedRevision: 4,
      heroId: "bastet",
    }),
  ).rejects.toThrow("publish failed");
});

it("does not treat a local-only build as a create publication conflict", () => {
  expect(getHeroBuildSet("bastet")).not.toBeNull();
  expect(hasCreatePublicationConflict(null)).toBe(false);
});
