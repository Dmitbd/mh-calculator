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

test("divinity branch builder screen is composed from focused sections", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/features/admin/screens/DivinityBranchBuilderScreen.tsx"),
    "utf8",
  );
  const requiredSections = [
    "BuildTargetSection",
    "HeroBuilderSection",
    "EquipmentBuilderSection",
    "WeaponAwakeningSection",
    "BranchGridSection",
    "BuilderActions",
  ];

  const missingSections = requiredSections.filter(
    (sectionName) => !source.includes(sectionName),
  );

  expect(missingSections).toEqual([]);
});

test("admin production code does not retain the removed file JSON workflow", () => {
  const forbiddenFragments = [
    "DownloadJsonButton",
    "DownloadSection",
    "downloadJson",
    "slugifyFileName",
    "showAdvancedActions",
    "Скачать полный JSON",
    "Загрузить билд",
    "Сохранить черновик",
    "ошибки полного экспорта",
  ];
  const offenders = listSourceFiles(path.join(repoRoot, "src/features/admin"))
    .filter((filePath) => !filePath.includes(`${path.sep}__tests__${path.sep}`))
    .flatMap((filePath) => {
      const source = fs.readFileSync(filePath, "utf8");

      return forbiddenFragments
        .filter((fragment) => source.includes(fragment))
        .map((fragment) => ({
          filePath: path.relative(repoRoot, filePath),
          fragment,
        }));
    });

  expect(offenders).toEqual([]);
});

test("divinity branch builder screen delegates application orchestration to its controller", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/features/admin/screens/DivinityBranchBuilderScreen.tsx"),
    "utf8",
  );
  const forbiddenFragments = [
    "getSupabaseClient",
    "@/features/auth",
    "heroBuildSetRepository",
    "builderServerCommands",
    "BuilderAsyncController",
    "BuilderRevisionStore",
    "useAdminSessionGate",
    "useHeroBuildStatusQuery",
  ];

  expect(
    forbiddenFragments.filter((fragment) => source.includes(fragment)),
  ).toEqual([]);
  expect(source).toContain("useDivinityBranchBuilderController");
});
