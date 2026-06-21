import { equipmentArtifacts, equipmentRunes } from "../catalog";

function expectUniqueIds(items: readonly { id: string }[]) {
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
}

describe("equipment catalogs", () => {
  test("use unique stable ids", () => {
    expectUniqueIds(equipmentArtifacts);
    expectUniqueIds(equipmentRunes);
  });

  test("asset paths use public img paths", () => {
    [...equipmentArtifacts, ...equipmentRunes].forEach((item) => {
      expect(item.icon).toMatch(/^\/img\//);
    });
  });
});
