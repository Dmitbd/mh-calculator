import bastetBuild from "@/features/game-data/heroes/builds/bastet.json";
import moranaBuild from "@/features/game-data/heroes/builds/morana.json";

import {
  createHeroBuildSnapshot,
  parseHeroBuildSnapshot,
  sha256Hex,
} from "../heroBuildSnapshot";

const CONTENT_DATE = "2026-06-22T18:10:50.213000Z";

describe("hero build snapshot contract", () => {
  test("uses the portable SHA-256 implementation", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  test("creates byte-identical canonical files for equivalent unordered data", () => {
    const first = createHeroBuildSnapshot({
      contentUpdatedAt: CONTENT_DATE,
      contentVersion: "hero-builds:stable",
      heroBuilds: [
        { buildSet: moranaBuild, heroId: "morana" },
        { buildSet: bastetBuild, heroId: "bastet" },
      ],
    });
    const second = createHeroBuildSnapshot({
      contentUpdatedAt: CONTENT_DATE,
      contentVersion: "hero-builds:stable",
      heroBuilds: [
        { buildSet: bastetBuild, heroId: "bastet" },
        { buildSet: moranaBuild, heroId: "morana" },
      ],
    });

    expect(second).toEqual(first);
    expect(first.resourceJson.endsWith("\n")).toBe(true);
    expect(first.manifestJson.endsWith("\n")).toBe(true);
  });

  test("validates the complete resource and checksum before accepting it", () => {
    const snapshot = createHeroBuildSnapshot({
      contentUpdatedAt: CONTENT_DATE,
      contentVersion: "hero-builds:stable",
      heroBuilds: [{ buildSet: bastetBuild, heroId: "bastet" }],
    });

    expect(
      parseHeroBuildSnapshot(snapshot.manifestJson, snapshot.resourceJson),
    ).toMatchObject({
      manifest: { contentUpdatedAt: CONTENT_DATE, schemaVersion: 1 },
      heroBuilds: [{ heroId: "bastet" }],
    });

    expect(() =>
      parseHeroBuildSnapshot(
        snapshot.manifestJson,
        snapshot.resourceJson.replace("bastet", "morana"),
      ),
    ).toThrow("checksum");
  });

  test("rejects duplicate ids, incompatible schemas, invalid dates, and extra fields", () => {
    const duplicate = {
      heroBuilds: [
        { buildSet: bastetBuild, heroId: "bastet" },
        { buildSet: bastetBuild, heroId: "bastet" },
      ],
    };
    const resourceJson = `${JSON.stringify(duplicate)}\n`;
    const manifest = {
      contentUpdatedAt: "client-time",
      contentVersion: "hero-builds:stable",
      resources: {
        heroBuilds: {
          checksum: `sha256:${sha256Hex(resourceJson)}`,
          file: "hero-builds.json",
        },
      },
      schemaVersion: 2,
      unexpected: true,
    };

    expect(() =>
      parseHeroBuildSnapshot(`${JSON.stringify(manifest)}\n`, resourceJson),
    ).toThrow();
  });
});
