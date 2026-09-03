const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../..");

function listSourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        continue;
      }

      files.push(...listSourceFiles(entryPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

test("shared production code contains only capability-neutral contracts", () => {
  const forbiddenCapabilityTerms =
    /\b(AdminSession|admin-auth|builderTheme|heroBuilds)\b/;
  const forbiddenSharedFiles = new Set([
    "adminAuth.ts",
    "builderTheme.ts",
    "dataBootstrap.ts",
    "sourceSelection.ts",
  ]);
  const offenders = listSourceFiles(path.join(repoRoot, "src/shared"))
    .filter(
      (filePath) =>
        forbiddenSharedFiles.has(path.basename(filePath)) ||
        forbiddenCapabilityTerms.test(read(filePath)),
    )
    .map(relative);

  expect(offenders).toEqual([]);
});

test("game catalogs and generated build snapshots live with their owners", () => {
  expect(
    fs.existsSync(
      path.join(repoRoot, "src/features/game-data/divinity/divinity-levels.json"),
    ),
  ).toBe(true);
  expect(
    fs.existsSync(
      path.join(
        repoRoot,
        "src/features/builds/data/generated/hero-builds/manifest.json",
      ),
    ),
  ).toBe(true);
  expect(
    fs.existsSync(path.join(repoRoot, "src/features/divinity/data")),
  ).toBe(false);
  expect(
    fs.existsSync(path.join(repoRoot, "src/features/game-data/snapshots")),
  ).toBe(false);
});

test("shared production UI does not contain build-specific components", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/shared/ui"))
    .filter((filePath) => path.basename(filePath).includes("Build"))
    .map(relative);

  expect(offenders).toEqual([]);
});

test("new feature presentation folders use components unless explicitly allowed", () => {
  const allowedUiFolders = new Set(["src/features/divinity/ui"]);
  const featureDirs = fs
    .readdirSync(path.join(repoRoot, "src/features"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(repoRoot, "src/features", entry.name));

  const offenders = featureDirs
    .map((featureDir) => path.join(featureDir, "ui"))
    .filter((uiDir) => fs.existsSync(uiDir))
    .map(relative)
    .filter((uiDir) => !allowedUiFolders.has(uiDir));

  expect(offenders).toEqual([]);
});
