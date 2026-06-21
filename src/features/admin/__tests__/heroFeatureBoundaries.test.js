const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../../..");

function listSourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(entryPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

test("admin and game-data code do not import heroes feature internals", () => {
  const checkedRoots = [
    path.join(repoRoot, "src/features/admin"),
    path.join(repoRoot, "src/features/game-data"),
  ];
  const offenders = checkedRoots
    .flatMap(listSourceFiles)
    .filter((filePath) => path.basename(filePath) !== "heroFeatureBoundaries.test.js")
    .filter((filePath) =>
      fs.readFileSync(filePath, "utf8").includes("@/features/heroes"),
    )
    .map((filePath) => path.relative(repoRoot, filePath));

  expect(offenders).toEqual([]);
});

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
