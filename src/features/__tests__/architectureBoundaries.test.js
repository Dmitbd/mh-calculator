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

test("production screens and hooks do not import raw json catalogs", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/features"))
    .filter(
      (filePath) =>
        filePath.includes(`${path.sep}screens${path.sep}`) ||
        filePath.includes(`${path.sep}hooks${path.sep}`),
    )
    .filter((filePath) => /from\s+["'][^"']+\.json["']/.test(read(filePath)))
    .map(relative);

  expect(offenders).toEqual([]);
});

test("non-admin production features do not import admin internals", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/features"))
    .filter((filePath) => !filePath.includes(`${path.sep}admin${path.sep}`))
    .filter((filePath) => read(filePath).includes("@/features/admin"))
    .map(relative);

  expect(offenders).toEqual([]);
});

test("game-data production code does not import UI or app features", () => {
  const forbiddenPatterns = [
    /@\/features\/(admin|builds|divinity|heroes)\//,
    /@\/shared\/ui\//,
    /from\s+["']react-native/,
  ];
  const offenders = listSourceFiles(path.join(repoRoot, "src/features/game-data"))
    .filter((filePath) =>
      forbiddenPatterns.some((pattern) => pattern.test(read(filePath))),
    )
    .map(relative);

  expect(offenders).toEqual([]);
});

test("shared production code does not import feature modules", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/shared"))
    .filter((filePath) => read(filePath).includes("@/features/"))
    .map(relative);

  expect(offenders).toEqual([]);
});

test("shared production UI does not contain build-specific components", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/shared/ui"))
    .filter((filePath) => path.basename(filePath).includes("Build"))
    .map(relative);

  expect(offenders).toEqual([]);
});

test("features consume builds through public entrypoints", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/features"))
    .filter((filePath) => !filePath.includes(`${path.sep}builds${path.sep}`))
    .filter((filePath) =>
      /@\/features\/builds\/(components|types)\//.test(read(filePath)),
    )
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
