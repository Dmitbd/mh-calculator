import manifest from "../hero-builds/manifest.json";
import resource from "../hero-builds/hero-builds.json";
import { createHeroBuildSnapshot, parseHeroBuildSnapshot } from "@/features/builds/data/heroBuildSnapshot";

test("generated bundled hero build snapshot is complete and checksum-valid", () => {
  const recreated = createHeroBuildSnapshot({
    contentUpdatedAt: manifest.contentUpdatedAt,
    contentVersion: manifest.contentVersion,
    heroBuilds: resource.heroBuilds,
  });
  expect(JSON.parse(recreated.manifestJson)).toEqual(manifest);
  expect(parseHeroBuildSnapshot(recreated.manifestJson, recreated.resourceJson).heroBuilds.map(({ heroId }) => heroId)).toEqual(["bastet", "morana"]);
});
