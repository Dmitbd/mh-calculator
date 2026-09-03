const path = require("node:path");

const { listAppRoutes } = require("../../../scripts/lib/appRoutes.cjs");

const expectedRoutes = [
  "/",
  "/admin/branch-builder",
  "/antiques",
  "/antiques/manual",
  "/divinity",
  "/divinity/manual",
  "/divinity-talents",
  "/divinity-talents/manual",
  "/heroes",
  "/heroes/[heroId]",
  "/summon-rivalry",
  "/summon-rivalry/manual",
  "/weekly-rivalry/beastly-echoes",
  "/weekly-rivalry/beastly-echoes/manual",
  "/weekly-rivalry/tower-of-babel",
  "/weekly-rivalry/tower-of-babel/manual",
  "/weekly-rivalry/zodiac-map",
  "/weekly-rivalry/zodiac-map/manual",
].sort();

test("Expo app exposes only the canonical route inventory", () => {
  const appDirectory = path.resolve(__dirname, "../../../app");

  expect(listAppRoutes(appDirectory)).toEqual(expectedRoutes);
});
