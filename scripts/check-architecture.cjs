const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const {
  buildTypeScriptProjectGraph,
  findArchitectureViolations,
} = require("./lib/typescriptImportGraph.cjs");

const projectRoot = path.resolve(__dirname, "..");

function featureName(filePath) {
  return /^src\/features\/([^/]+)\//.exec(filePath)?.[1] ?? null;
}

function isTestOrTestingFixture(filePath) {
  return (
    filePath.split("/").some((segment) =>
      ["__tests__", "testing"].includes(segment),
    ) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath)
  );
}

const SHARED_DOMAIN_CONTRACT_PATTERN =
  /\b(?:HeroBuild\w*|hero_build\w*|Divinity\w*|Rivalry\w*|Antique\w*|Summon\w*|AdminSession\w*)\b/g;

function findSharedDomainKnowledgeViolations({ projectRoot }) {
  const sharedRoot = path.join(projectRoot, "src/shared");
  if (!fs.existsSync(sharedRoot)) return [];

  const pending = [sharedRoot];
  const violations = [];
  while (pending.length > 0) {
    const currentPath = pending.pop();
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (!["__tests__", "testing"].includes(entry.name)) {
          pending.push(absolutePath);
        }
        continue;
      }
      if (
        !/\.(?:ts|tsx)$/.test(entry.name) ||
        /(?:\.test|\.spec|\.d)\.(?:ts|tsx)$/.test(entry.name)
      ) {
        continue;
      }

      const matches = Array.from(
        new Set(fs.readFileSync(absolutePath, "utf8").match(SHARED_DOMAIN_CONTRACT_PATTERN) ?? []),
      );
      if (matches.length > 0) {
        const file = path.relative(projectRoot, absolutePath).split(path.sep).join("/");
        violations.push({
          file,
          importer: file,
          resolvedTarget: null,
          rule: "shared-cannot-declare-game-domain-contracts",
          specifier: matches.join(","),
        });
      }
    }
  }

  return violations.sort((left, right) => left.file.localeCompare(right.file));
}

const CANONICAL_BUILD_CONTRACT_EXPORTS = new Set([
  "DivinityBranchBuildDraft",
  "DivinityBranchBuilderExport",
  "DivinityBranchBuildExport",
  "DivinityBranchBuildValidationDraft",
  "DivinityGameMode",
  "DivinitySkillCostMap",
  "DivinitySkillLoadout",
  "DivinitySkillLoadoutBudget",
  "DivinitySkillLoadoutDraft",
  "DivinitySkillLoadoutRowId",
  "HeroBuildSet",
  "HeroBuildTab",
  "HeroBuildTabKind",
  "HeroBuildTabPath",
  "HeroBuildTargetTabPath",
]);

function findGameDataBuildContractExportViolations({ projectRoot }) {
  const gameDataRoot = path.join(projectRoot, "src/features/game-data");
  if (!fs.existsSync(gameDataRoot)) return [];

  const pending = [gameDataRoot];
  const violations = [];
  while (pending.length > 0) {
    const currentPath = pending.pop();
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(projectRoot, absolutePath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (
          !["__tests__", "testing"].includes(entry.name) &&
          relativePath !== "src/features/game-data/builds"
        ) {
          pending.push(absolutePath);
        }
        continue;
      }
      if (
        !/\.(?:ts|tsx)$/.test(entry.name) ||
        /(?:\.test|\.spec|\.d)\.(?:ts|tsx)$/.test(entry.name)
      ) {
        continue;
      }

      const source = fs.readFileSync(absolutePath, "utf8");
      const sourceFile = ts.createSourceFile(
        absolutePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        entry.name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const exportedContracts = new Set();
      for (const statement of sourceFile.statements) {
        const isExported = statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        );
        if (
          isExported &&
          statement.name &&
          CANONICAL_BUILD_CONTRACT_EXPORTS.has(statement.name.text)
        ) {
          exportedContracts.add(statement.name.text);
        }
        if (!ts.isExportDeclaration(statement)) continue;

        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            for (const name of [element.propertyName?.text, element.name.text]) {
              if (name && CANONICAL_BUILD_CONTRACT_EXPORTS.has(name)) {
                exportedContracts.add(name);
              }
            }
          }
        }
        const moduleSpecifier = statement.moduleSpecifier;
        if (
          moduleSpecifier &&
          ts.isStringLiteralLike(moduleSpecifier) &&
          /(?:^|\/)builds(?:\/types)?$/.test(moduleSpecifier.text)
        ) {
          exportedContracts.add(moduleSpecifier.text);
        }
      }

      if (exportedContracts.size > 0) {
        violations.push({
          file: relativePath,
          importer: relativePath,
          resolvedTarget: null,
          rule: "game-data-cannot-export-build-contracts-outside-owner",
          specifier: Array.from(exportedContracts).sort().join(","),
        });
      }
    }
  }

  return violations.sort((left, right) => left.file.localeCompare(right.file));
}

function createProjectArchitectureRules() {
  return [
    {
      name: "production-cannot-import-tests-or-testing-fixtures",
      test: (edge) =>
        edge.resolvedTarget !== null &&
        isTestOrTestingFixture(edge.resolvedTarget),
    },
    {
      from: ["src/shared"],
      name: "shared-cannot-import-features",
      to: ["src/features"],
    },
    {
      name: "game-data-must-remain-pure",
      test: (edge) => {
        if (featureName(edge.sourceFile) !== "game-data") return false;
        const targetFeature = edge.resolvedTarget
          ? featureName(edge.resolvedTarget)
          : null;
        return (
          (targetFeature !== null && targetFeature !== "game-data") ||
          edge.resolvedTarget?.startsWith("src/shared/ui/") === true ||
          edge.resolvedTarget?.startsWith("app/") === true ||
          ["expo-router", "react", "react-native"].includes(edge.specifier)
        );
      },
    },
    {
      name: "auth-must-remain-independent",
      test: (edge) => {
        if (featureName(edge.sourceFile) !== "auth") return false;
        const targetFeature = edge.resolvedTarget
          ? featureName(edge.resolvedTarget)
          : null;
        return (
          (targetFeature !== null && targetFeature !== "auth") ||
          edge.resolvedTarget?.startsWith("app/") === true
        );
      },
    },
    {
      name: "build-contract-must-use-public-api",
      test: (edge) =>
        ["admin", "heroes"].includes(featureName(edge.sourceFile)) &&
        edge.resolvedTarget?.startsWith("src/features/game-data/builds/") ===
          true,
    },
    {
      name: "cross-feature-import-must-use-approved-owner-api",
      test: (edge) => {
        if (!edge.resolvedTarget) return false;
        const sourceFeature = featureName(edge.sourceFile);
        const targetFeature = featureName(edge.resolvedTarget);
        if (
          sourceFeature === null ||
          targetFeature === null ||
          sourceFeature === targetFeature ||
          ["auth", "game-data"].includes(sourceFeature)
        ) {
          return false;
        }
        if (targetFeature === "game-data") return false;

        const approvedConsumer = ["admin", "heroes"].includes(sourceFeature);
        if (targetFeature === "builds") {
          return !(
            approvedConsumer &&
            edge.resolvedTarget === "src/features/builds/index.ts" &&
            edge.specifier === "@/features/builds"
          );
        }
        if (targetFeature === "auth") {
          return !(
            approvedConsumer &&
            edge.resolvedTarget === "src/features/auth/index.ts" &&
            edge.specifier === "@/features/auth"
          );
        }
        return true;
      },
    },
    {
      name: "owner-must-not-import-its-public-barrel",
      test: (edge) => {
        const owner = featureName(edge.sourceFile);
        if (!owner || !["auth", "builds"].includes(owner)) return false;
        return (
          edge.sourceFile !== `src/features/${owner}/index.ts` &&
          edge.resolvedTarget === `src/features/${owner}/index.ts`
        );
      },
    },
    {
      name: "screens-and-hooks-cannot-import-raw-json",
      test: (edge) =>
        edge.resolvedTarget?.endsWith(".json") === true &&
        (/\/screens\//.test(edge.sourceFile) || /\/hooks\//.test(edge.sourceFile)),
    },
    {
      name: "app-routes-must-remain-thin",
      test: (edge) => {
        if (!edge.sourceFile.startsWith("app/") || !edge.resolvedTarget) {
          return false;
        }
        if (edge.resolvedTarget.startsWith("app/")) return true;
        if (edge.resolvedTarget === "src/shared/ui/AppErrorBoundary.tsx") {
          return edge.sourceFile !== "app/_layout.tsx";
        }
        if (/^src\/features\/[^/]+\/screens\//.test(edge.resolvedTarget)) {
          return false;
        }
        return !(
          edge.sourceFile === "app/heroes/[heroId].tsx" &&
          edge.resolvedTarget === "src/features/game-data/heroes/index.ts"
        );
      },
    },
  ];
}

function findUnreachableProductionModuleViolations({ files, graph }) {
  const outgoingTargets = new Map();
  for (const { resolvedTarget, sourceFile } of graph) {
    if (resolvedTarget === null) continue;
    const targets = outgoingTargets.get(sourceFile) ?? [];
    targets.push(resolvedTarget);
    outgoingTargets.set(sourceFile, targets);
  }

  const reachableFiles = new Set(files.filter((file) => file.startsWith("app/")));
  const pendingFiles = Array.from(reachableFiles);
  while (pendingFiles.length > 0) {
    const sourceFile = pendingFiles.shift();
    for (const target of outgoingTargets.get(sourceFile) ?? []) {
      if (reachableFiles.has(target)) continue;
      reachableFiles.add(target);
      pendingFiles.push(target);
    }
  }

  return files
    .filter(
      (file) => !file.startsWith("app/") && !reachableFiles.has(file),
    )
    .map((file) => ({
      file,
      importer: file,
      resolvedTarget: null,
      rule: "production-module-must-be-reachable-from-app",
      specifier: "<none>",
    }));
}

function runArchitectureCheck() {
  const { files, graph } = buildTypeScriptProjectGraph({
    projectRoot,
    roots: ["app", "src/features", "src/shared"],
    tsconfigPath: "tsconfig.json",
  });
  const violations = [
    ...findArchitectureViolations(graph, createProjectArchitectureRules()),
    ...findGameDataBuildContractExportViolations({ projectRoot }),
    ...findSharedDomainKnowledgeViolations({ projectRoot }),
    ...findUnreachableProductionModuleViolations({ files, graph }),
  ];

  if (violations.length > 0) {
    console.error(`Architecture violations: ${violations.length}`);
    for (const violation of violations) {
      console.error(
        `${violation.rule}: ${violation.importer} -> ${violation.specifier} (${violation.resolvedTarget ?? "external"})`,
      );
    }
    return 1;
  }

  console.log(`Architecture check passed: ${graph.length} production imports.`);
  return 0;
}

if (require.main === module) {
  process.exitCode = runArchitectureCheck();
}

module.exports = {
  createProjectArchitectureRules,
  findGameDataBuildContractExportViolations,
  findSharedDomainKnowledgeViolations,
  findUnreachableProductionModuleViolations,
  runArchitectureCheck,
};
