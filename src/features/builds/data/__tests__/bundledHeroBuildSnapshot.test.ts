import manifest from "../generated/hero-builds/manifest.json";
import resource from "../generated/hero-builds/hero-builds.json";
import { parseBundledHeroBuildSnapshot } from "../heroBuildSnapshotSource";

test("generated bundled hero build snapshot is complete and checksum-valid", () => {
  expect(
    parseBundledHeroBuildSnapshot(manifest, resource).heroBuilds.map(
      ({ heroId }) => heroId,
    ),
  ).toEqual([
    "amaterasu",
    "artemis",
    "bastet",
    "circe",
    "dionysus",
    "faust",
    "freyja",
    "gabriel",
    "hestia",
    "iset",
    "king-arthur",
    "leonidas",
    "lucifer",
    "luoshen",
    "morana",
    "morrigan",
    "nagakanya",
    "nyx",
    "oda-nobunaga",
    "odin",
    "susanoo",
    "western-queen",
  ]);
});

test.each([
  ["extra manifest field", { ...manifest, extra: true }, resource],
  ["wrong schema", { ...manifest, schemaVersion: 2 }, resource],
  ["wrong file", { ...manifest, resources: { heroBuilds: { ...manifest.resources.heroBuilds, file: "other.json" } } }, resource],
  ["extra resource field", manifest, { ...resource, extra: true }],
])("rejects bundled raw input with %s", (_label, rawManifest, rawResource) => {
  expect(() => parseBundledHeroBuildSnapshot(rawManifest, rawResource)).toThrow();
});
