import manifest from "../hero-builds/manifest.json";
import resource from "../hero-builds/hero-builds.json";
import { parseBundledHeroBuildSnapshot } from "@/features/builds/data/heroBuildSnapshotSource";

test("generated bundled hero build snapshot is complete and checksum-valid", () => {
  expect(parseBundledHeroBuildSnapshot(manifest, resource).heroBuilds.map(({ heroId }) => heroId)).toEqual(["bastet", "morana"]);
});

test.each([
  ["extra manifest field", { ...manifest, extra: true }, resource],
  ["wrong schema", { ...manifest, schemaVersion: 2 }, resource],
  ["wrong file", { ...manifest, resources: { heroBuilds: { ...manifest.resources.heroBuilds, file: "other.json" } } }, resource],
  ["extra resource field", manifest, { ...resource, extra: true }],
])("rejects bundled raw input with %s", (_label, rawManifest, rawResource) => {
  expect(() => parseBundledHeroBuildSnapshot(rawManifest, rawResource)).toThrow();
});
