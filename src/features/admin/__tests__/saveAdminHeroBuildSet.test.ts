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

it("publishes the matching draft in one repository operation", async () => {
  let resolvePublication!: () => void;
  mockedPublishDraft.mockReturnValue(
    new Promise<void>((resolve) => {
      resolvePublication = resolve;
    }),
  );

  const publication = publishAdminHeroBuildSet({
    buildSet,
    client,
    heroId: "bastet",
  });

  expect(mockedPublishDraft).toHaveBeenCalledWith(client, {
    buildSet,
    heroId: "bastet",
  });

  resolvePublication();

  await expect(publication).resolves.toBeUndefined();
});

it("surfaces an atomic publication failure", async () => {
  mockedPublishDraft.mockRejectedValue(new Error("publish failed"));

  await expect(
    publishAdminHeroBuildSet({ buildSet, client, heroId: "bastet" }),
  ).rejects.toThrow("publish failed");
});

it("does not treat a local-only build as a create publication conflict", () => {
  expect(getHeroBuildSet("bastet")).not.toBeNull();
  expect(hasCreatePublicationConflict(null)).toBe(false);
});
