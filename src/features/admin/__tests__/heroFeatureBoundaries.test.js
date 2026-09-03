const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../../..");

test("hero build screen uses reusable build components from builds feature", () => {
  const screenSource = fs.readFileSync(
    path.join(repoRoot, "src/features/heroes/screens/HeroBuildScreen.tsx"),
    "utf8",
  );
  const sectionSources = [
    "HeroBuildBranchSection.tsx",
    "HeroBuildEquipmentSection.tsx",
    "HeroBuildTabsSection.tsx",
    "HeroBuildWeaponAwakeningSection.tsx",
  ].map((fileName) =>
    fs.readFileSync(
      path.join(repoRoot, "src/features/heroes/components/hero-build", fileName),
      "utf8",
    ),
  );

  expect(sectionSources.some((source) => source.includes("@/features/builds"))).toBe(
    true,
  );
  expect(screenSource).not.toContain("../components/EquipmentVariantTabs");
});

test("hero build screen is composed from focused sections", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/features/heroes/screens/HeroBuildScreen.tsx"),
    "utf8",
  );
  const requiredSections = [
    "HeroBuildTabsSection",
    "HeroBuildEquipmentSection",
    "HeroBuildWeaponAwakeningSection",
    "HeroBuildBranchSection",
  ];

  expect(requiredSections.filter((name) => !source.includes(name))).toEqual([]);
});

test("build tree contracts belong to the builds owner", () => {
  const heroTypes = fs.readFileSync(
    path.join(repoRoot, "src/features/game-data/heroes/types.ts"),
    "utf8",
  );
  const buildTypes = fs.readFileSync(
    path.join(repoRoot, "src/features/game-data/builds/types.ts"),
    "utf8",
  );
  const buildsPublicApi = fs.readFileSync(
    path.join(repoRoot, "src/features/builds/index.ts"),
    "utf8",
  );

  expect(heroTypes).not.toMatch(/export type HeroBuild(?:Set|Tab|TabPath|TabKind)/);
  expect(buildTypes).toMatch(/export type HeroBuildSet/);
  expect(buildsPublicApi).toMatch(/HeroBuildSet/);
});
