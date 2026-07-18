import type { HeroBuildSet } from "@/features/game-data/heroes/types";
import { getHeroBuildSet } from "@/features/game-data/heroes";

import { saveHeroBuildSet } from "@/features/builds";
import {
  hasCreatePublicationConflict,
  saveAdminHeroBuildSet,
} from "../api/saveAdminHeroBuildSet";

jest.mock("@/features/builds", () => ({
  saveHeroBuildSet: jest.fn(),
}));

const mockedSave = jest.mocked(saveHeroBuildSet);
const buildSet: HeroBuildSet = { schemaVersion: 2, tabs: [] };
const client = { from: jest.fn() } as never;

beforeEach(() => mockedSave.mockReset());

it("refreshes published ids after a successful publication", async () => {
  const refreshPublishedHeroIds = jest.fn(async () => undefined);
  mockedSave.mockResolvedValue(undefined);

  await saveAdminHeroBuildSet({
    buildSet,
    client,
    heroId: "bastet",
    refreshPublishedHeroIds,
    status: "published",
  });

  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(refreshPublishedHeroIds).toHaveBeenCalledTimes(1);
});

it("does not refresh after a failed publication", async () => {
  const refreshPublishedHeroIds = jest.fn(async () => undefined);
  mockedSave.mockRejectedValue(new Error("save failed"));

  await expect(
    saveAdminHeroBuildSet({
      buildSet,
      client,
      heroId: "bastet",
      refreshPublishedHeroIds,
      status: "published",
    }),
  ).rejects.toThrow("save failed");

  expect(refreshPublishedHeroIds).not.toHaveBeenCalled();
});

it("does not refresh after saving a draft", async () => {
  const refreshPublishedHeroIds = jest.fn(async () => undefined);
  mockedSave.mockResolvedValue(undefined);

  await saveAdminHeroBuildSet({
    buildSet,
    client,
    heroId: "bastet",
    refreshPublishedHeroIds,
    status: "draft",
  });

  expect(refreshPublishedHeroIds).not.toHaveBeenCalled();
});

it("does not treat a local-only build as a create publication conflict", () => {
  expect(getHeroBuildSet("bastet")).not.toBeNull();
  expect(hasCreatePublicationConflict(null)).toBe(false);
});
