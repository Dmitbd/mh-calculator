const fs = require("node:fs");
const path = require("node:path");

test("snapshot-backed hero screens use the full atomic resource as their sole read", () => {
  for (const file of ["HeroSelectScreen.tsx", "HeroBuildScreen.tsx"]) {
    const source = fs.readFileSync(path.join(process.cwd(), "src/features/heroes/screens", file), "utf8");
    expect(source).toContain("loadAndCacheRemoteHeroBuildSnapshot");
    expect(source).not.toMatch(/fetchPublishedHeroIds|loadPublishedHeroBuildSet/);
  }
});
