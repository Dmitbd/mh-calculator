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

test("non-admin feature code does not import admin type contracts", () => {
  const checkedRoots = [
    path.join(repoRoot, "src/features/heroes"),
    path.join(repoRoot, "src/features/game-data"),
  ];
  const offenders = checkedRoots
    .flatMap(listSourceFiles)
    .filter((filePath) =>
      fs
        .readFileSync(filePath, "utf8")
        .includes("@/features/admin/types/admin.types"),
    )
    .map((filePath) => path.relative(repoRoot, filePath));

  expect(offenders).toEqual([]);
});

test("admin hooks do not import raw json catalogs", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/features/admin/hooks"))
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes(".json"))
    .map((filePath) => path.relative(repoRoot, filePath));

  expect(offenders).toEqual([]);
});
