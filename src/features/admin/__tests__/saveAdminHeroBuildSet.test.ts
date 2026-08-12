import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import { getHeroBuildSet } from "@/features/game-data/heroes";

import { deleteDraftHeroBuildSet, saveHeroBuildSet } from "@/features/builds";
import {
  hasCreatePublicationConflict,
  publishAdminHeroBuildSet,
} from "../api/saveAdminHeroBuildSet";

jest.mock("@/features/builds", () => ({
  deleteDraftHeroBuildSet: jest.fn(),
  saveHeroBuildSet: jest.fn(),
}));

const mockedSave = jest.mocked(saveHeroBuildSet);
const mockedDeleteDraft = jest.mocked(deleteDraftHeroBuildSet);
const buildSet: HeroBuildSet = { schemaVersion: 2, tabs: [] };
const client = { from: jest.fn() } as never;

beforeEach(() => {
  mockedSave.mockReset();
  mockedDeleteDraft.mockReset();
});

it("publishes before deleting the matching draft", async () => {
  let resolveSave!: () => void;
  mockedSave.mockReturnValue(
    new Promise<void>((resolve) => {
      resolveSave = resolve;
    }),
  );
  mockedDeleteDraft.mockResolvedValue(undefined);

  const publication = publishAdminHeroBuildSet({
    buildSet,
    client,
    heroId: "bastet",
  });

  expect(mockedSave).toHaveBeenCalledWith(client, {
    buildSet,
    heroId: "bastet",
    status: "published",
  });
  expect(mockedDeleteDraft).not.toHaveBeenCalled();

  resolveSave();

  await expect(publication).resolves.toEqual({ draftCleanupError: null });
  expect(mockedDeleteDraft).toHaveBeenCalledWith(client, "bastet");
});

it("preserves the draft when publication fails", async () => {
  mockedSave.mockRejectedValue(new Error("publish failed"));

  await expect(
    publishAdminHeroBuildSet({ buildSet, client, heroId: "bastet" }),
  ).rejects.toThrow("publish failed");

  expect(mockedDeleteDraft).not.toHaveBeenCalled();
});

it("returns a cleanup error after a successful publication", async () => {
  mockedSave.mockResolvedValue(undefined);
  mockedDeleteDraft.mockRejectedValue(new Error("cleanup failed"));

  await expect(
    publishAdminHeroBuildSet({ buildSet, client, heroId: "bastet" }),
  ).resolves.toEqual({ draftCleanupError: new Error("cleanup failed") });
});

it("does not treat a local-only build as a create publication conflict", () => {
  expect(getHeroBuildSet("bastet")).not.toBeNull();
  expect(hasCreatePublicationConflict(null)).toBe(false);
});
