import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadHeroBuildSnapshotFallback } from "../heroBuildSnapshotSource";
import { HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS } from "../../storage/heroBuildSnapshotStorage";

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("falls through a hung default storage enumeration to bundled data", async () => {
  jest.useFakeTimers();
  jest.spyOn(AsyncStorage, "getAllKeys").mockReturnValue(
    new Promise(() => undefined),
  );

  const fallback = loadHeroBuildSnapshotFallback();
  await jest.advanceTimersByTimeAsync(HERO_BUILD_SNAPSHOT_STORAGE_TIMEOUT_MS);

  await expect(fallback).resolves.toMatchObject({
    source: "bundled",
    snapshot: {
      heroBuilds: expect.arrayContaining([
        expect.objectContaining({ heroId: "bastet" }),
      ]),
    },
  });
});
