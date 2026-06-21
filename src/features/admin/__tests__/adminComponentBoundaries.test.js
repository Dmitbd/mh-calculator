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

test("heroes feature code does not import admin components", () => {
  const offenders = listSourceFiles(path.join(repoRoot, "src/features/heroes"))
    .filter((filePath) =>
      fs
        .readFileSync(filePath, "utf8")
        .includes("@/features/admin/components"),
    )
    .map((filePath) => path.relative(repoRoot, filePath));

  expect(offenders).toEqual([]);
});
