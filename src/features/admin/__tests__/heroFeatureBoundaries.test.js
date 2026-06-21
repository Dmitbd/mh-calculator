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
