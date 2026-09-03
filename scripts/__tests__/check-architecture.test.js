const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildTypeScriptImportGraph,
  buildTypeScriptProjectGraph,
  findArchitectureViolations,
} = require("../lib/typescriptImportGraph.cjs");
const {
  createProjectArchitectureRules,
  findGameDataBuildContractExportViolations,
  findSharedDomainKnowledgeViolations,
  findUnreachableProductionModuleViolations,
} = require("../check-architecture.cjs");

const temporaryProjects = [];
const repoRoot = path.resolve(__dirname, "../..");

afterEach(() => {
  for (const projectRoot of temporaryProjects.splice(0)) {
    fs.rmSync(projectRoot, { force: true, recursive: true });
  }
});

function createProject(files) {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "mh-architecture-fixture-"),
  );
  temporaryProjects.push(projectRoot);

  const config = {
    compilerOptions: {
      baseUrl: ".",
      module: "commonjs",
      paths: { "@/*": ["src/*"] },
      resolveJsonModule: true,
      target: "es2022",
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
  };
  fs.writeFileSync(
    path.join(projectRoot, "tsconfig.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );

  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, source);
  }

  return projectRoot;
}

function buildGraph(projectRoot) {
  return buildTypeScriptImportGraph({
    projectRoot,
    roots: ["src"],
    tsconfigPath: "tsconfig.json",
  });
}

const forbidFeatureB = {
  from: ["src/features/a"],
  name: "fixture-cross-feature",
  to: ["src/features/b"],
};

test("resolves alias, relative, re-export, type-only and dynamic imports", () => {
  const projectRoot = createProject({
    "src/features/a/index.ts": [
      'import { value as aliasValue } from "@/features/b";',
      "import type {",
      "  Thing,",
      '} from "../b/types";',
      "export {",
      "  value as reexportedValue,",
      '} from "../b";',
      'export const load = () => import("../b/dynamic");',
      'export const required = require("../b/required");',
      "export const values = [aliasValue] as Thing[];",
    ].join("\n"),
    "src/features/b/dynamic.ts": "export const dynamicValue = 1;\n",
    "src/features/b/index.ts": "export const value = 1;\n",
    "src/features/b/required.ts": "export const requiredValue = 1;\n",
    "src/features/b/types.ts": "export type Thing = number;\n",
  });

  const violations = findArchitectureViolations(buildGraph(projectRoot), [
    forbidFeatureB,
  ]);

  expect(violations).toEqual([
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/index.ts",
      rule: "fixture-cross-feature",
      specifier: "../b",
    },
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/dynamic.ts",
      rule: "fixture-cross-feature",
      specifier: "../b/dynamic",
    },
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/required.ts",
      rule: "fixture-cross-feature",
      specifier: "../b/required",
    },
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/types.ts",
      rule: "fixture-cross-feature",
      specifier: "../b/types",
    },
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/index.ts",
      rule: "fixture-cross-feature",
      specifier: "@/features/b",
    },
  ]);
});

test("resolves inline import types and dynamic imports with attributes", () => {
  const projectRoot = createProject({
    "src/features/a/index.ts": [
      'export type PrivateType = import("@/features/b/types").Thing;',
      "export const load = () =>",
      '  import("../b/data.json", { with: { type: "json" } });',
    ].join("\n"),
    "src/features/b/data.json": "{\"value\":1}\n",
    "src/features/b/types.ts": "export type Thing = number;\n",
  });

  const violations = findArchitectureViolations(buildGraph(projectRoot), [
    forbidFeatureB,
  ]);

  expect(violations).toEqual([
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/data.json",
      rule: "fixture-cross-feature",
      specifier: "../b/data.json",
    },
    {
      importer: "src/features/a/index.ts",
      resolvedTarget: "src/features/b/types.ts",
      rule: "fixture-cross-feature",
      specifier: "@/features/b/types",
    },
  ]);
});

test("keeps external imports in the graph and excludes test sources", () => {
  const projectRoot = createProject({
    "src/features/a/__tests__/ignored.test.ts":
      'import "@/features/b";\n',
    "src/features/a/index.ts": 'import React from "react";\nexport { React };\n',
    "src/features/b/index.ts": "export const value = 1;\n",
  });

  const graph = buildGraph(projectRoot);

  expect(graph).toEqual([
    {
      external: true,
      resolvedTarget: null,
      sourceFile: "src/features/a/index.ts",
      specifier: "react",
    },
  ]);
  expect(findArchitectureViolations(graph, [forbidFeatureB])).toEqual([]);
});

test("rejects production imports from tests and testing fixtures", () => {
  const projectRoot = createProject({
    "src/features/a/screens/Screen.ts":
      'export { value } from "../model/useFixture";\n',
    "src/features/a/model/useFixture.ts": [
      'export { hidden } from "./hidden.test";',
      'export { helper as value } from "../testing/helper";',
    ].join("\n"),
    "src/features/a/model/hidden.test.ts": "export const hidden = true;\n",
    "src/features/a/testing/helper.ts": "export const helper = true;\n",
  });

  expect(
    findArchitectureViolations(
      buildGraph(projectRoot),
      createProjectArchitectureRules(),
    )
      .map(({ resolvedTarget, rule }) => ({ resolvedTarget, rule }))
      .sort((left, right) =>
        left.resolvedTarget.localeCompare(right.resolvedTarget),
      ),
  ).toEqual([
    {
      resolvedTarget: "src/features/a/model/hidden.test.ts",
      rule: "production-cannot-import-tests-or-testing-fixtures",
    },
    {
      resolvedTarget: "src/features/a/testing/helper.ts",
      rule: "production-cannot-import-tests-or-testing-fixtures",
    },
  ]);
});

test("rejects orphan production files but keeps app routes as entrypoints", () => {
  const projectRoot = createProject({
    "app/index.ts": 'import "../src/features/live";\n',
    "app/standalone.ts": "export const route = true;\n",
    "src/features/live.ts": "export const live = true;\n",
    "src/features/orphan.ts": "export const orphan = true;\n",
  });
  const configPath = path.join(projectRoot, "tsconfig.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  config.include.unshift("app/**/*.ts");
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const { files, graph } = buildTypeScriptProjectGraph({
    projectRoot,
    roots: ["app", "src/features"],
    tsconfigPath: "tsconfig.json",
  });

  expect(findUnreachableProductionModuleViolations({ files, graph })).toEqual([
    {
      file: "src/features/orphan.ts",
      importer: "src/features/orphan.ts",
      resolvedTarget: null,
      rule: "production-module-must-be-reachable-from-app",
      specifier: "<none>",
    },
  ]);
});

test("rejects an unreachable production island whose files consume each other", () => {
  const projectRoot = createProject({
    "app/index.ts": 'import "../src/features/live";\n',
    "src/features/live.ts": "export const live = true;\n",
    "src/features/orphan-a.ts": [
      'import { orphanB } from "./orphan-b";',
      "export const orphanA = orphanB;",
    ].join("\n"),
    "src/features/orphan-b.ts": [
      'import { orphanA } from "./orphan-a";',
      "export const orphanB = orphanA;",
    ].join("\n"),
  });
  const configPath = path.join(projectRoot, "tsconfig.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  config.include.unshift("app/**/*.ts");
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const { files, graph } = buildTypeScriptProjectGraph({
    projectRoot,
    roots: ["app", "src/features"],
    tsconfigPath: "tsconfig.json",
  });

  expect(
    findUnreachableProductionModuleViolations({ files, graph }).map(
      ({ file }) => file,
    ),
  ).toEqual([
    "src/features/orphan-a.ts",
    "src/features/orphan-b.ts",
  ]);
});

test("allows a narrower target explicitly excluded from a rule", () => {
  const projectRoot = createProject({
    "src/features/a/index.ts": 'export { value } from "@/features/b";\n',
    "src/features/b/index.ts": "export const value = 1;\n",
  });

  expect(
    findArchitectureViolations(buildGraph(projectRoot), [
      { ...forbidFeatureB, allow: ["src/features/b/index.ts"] },
    ]),
  ).toEqual([]);
});

test("project rules reject every governed dependency direction", () => {
  const graph = [
    edge("src/shared/lib/tool.ts", "@/features/admin", "src/features/admin/index.ts"),
    edge("src/features/game-data/heroes/catalog.ts", "@/shared/ui/Card", "src/shared/ui/Card.tsx"),
    edge("src/features/auth/session.ts", "@/features/builds", "src/features/builds/index.ts"),
    edge("src/features/heroes/screen.ts", "@/features/builds/model/private", "src/features/builds/model/private.ts"),
    edge("src/features/admin/hook.ts", "@/features/auth/private", "src/features/auth/private.ts"),
    edge("src/features/builds/model/rule.ts", "@/features/builds", "src/features/builds/index.ts"),
    edge("src/features/divinity/screens/Screen.tsx", "./data.json", "src/features/divinity/data.json"),
    edge("app/divinity.tsx", "../src/features/divinity/model/calculate", "src/features/divinity/model/calculate.ts"),
  ];

  expect(
    findArchitectureViolations(graph, createProjectArchitectureRules()).map(
      ({ rule }) => rule,
    ),
  ).toEqual([
    "app-routes-must-remain-thin",
    "cross-feature-import-must-use-approved-owner-api",
    "auth-must-remain-independent",
    "owner-must-not-import-its-public-barrel",
    "screens-and-hooks-cannot-import-raw-json",
    "game-data-must-remain-pure",
    "cross-feature-import-must-use-approved-owner-api",
    "shared-cannot-import-features",
  ]);
});

test("project rules allow documented public owners and catalog reads", () => {
  const graph = [
    edge("src/features/admin/hook.ts", "@/features/auth", "src/features/auth/index.ts"),
    edge("src/features/heroes/screen.ts", "@/features/builds", "src/features/builds/index.ts"),
    edge("src/features/divinity/model/calculate.ts", "@/features/game-data/divinity", "src/features/game-data/divinity/index.ts"),
    edge("app/heroes/[heroId].tsx", "../../src/features/game-data/heroes", "src/features/game-data/heroes/index.ts"),
    edge("app/divinity.tsx", "../src/features/divinity/screens/DivinityScreen", "src/features/divinity/screens/DivinityScreen.tsx"),
  ];

  expect(
    findArchitectureViolations(graph, createProjectArchitectureRules()),
  ).toEqual([]);
});

test("admin and heroes cannot bypass the build public API through game-data", () => {
  const graph = [
    edge(
      "src/features/admin/model/build.ts",
      "@/features/game-data/builds/types",
      "src/features/game-data/builds/types.ts",
    ),
    edge(
      "src/features/heroes/model/build.ts",
      "@/features/game-data/builds/types",
      "src/features/game-data/builds/types.ts",
    ),
  ];

  expect(
    findArchitectureViolations(graph, createProjectArchitectureRules()).map(
      ({ rule }) => rule,
    ),
  ).toEqual([
    "build-contract-must-use-public-api",
    "build-contract-must-use-public-api",
  ]);
});

test("shared Supabase infrastructure contains no build database contract", () => {
  const sharedDatabaseContract = path.join(
    repoRoot,
    "src/shared/lib/database.types.ts",
  );
  const sharedClientSource = fs.readFileSync(
    path.join(repoRoot, "src/shared/lib/supabaseClient.ts"),
    "utf8",
  );
  const buildDatabaseSource = fs.readFileSync(
    path.join(repoRoot, "src/features/builds/data/database.types.ts"),
    "utf8",
  );

  expect(fs.existsSync(sharedDatabaseContract)).toBe(false);
  expect(sharedClientSource).not.toMatch(/hero_build_sets|database\.types/);
  expect(buildDatabaseSource).toContain("hero_build_sets");
});

test("detects game-domain contracts declared inline under shared", () => {
  const projectRoot = createProject({
    "src/shared/domainSchema.ts": [
      "export type HeroBuildSetRow = { hero_id: string };",
      "export const table = 'hero_build_sets';",
    ].join("\n"),
    "src/shared/generic.ts": "export type RequestState = 'idle' | 'ready';\n",
  });

  expect(findSharedDomainKnowledgeViolations({ projectRoot })).toEqual([
    expect.objectContaining({
      file: "src/shared/domainSchema.ts",
      rule: "shared-cannot-declare-game-domain-contracts",
    }),
  ]);
});

test("rejects a second game-data facade for canonical build contracts", () => {
  const projectRoot = createProject({
    "src/features/game-data/builds/types.ts":
      "export type HeroBuildSet = { tabs: unknown[] };\n",
    "src/features/game-data/heroes/direct.ts":
      "export type { HeroBuildSet } from '../builds/types';\n",
    "src/features/game-data/heroes/local.ts":
      "export type HeroBuildTabPath = string[];\n",
    "src/features/game-data/heroes/catalog.ts":
      "export type Hero = { id: string };\n",
  });

  expect(
    findGameDataBuildContractExportViolations({ projectRoot }).map(
      ({ file }) => file,
    ),
  ).toEqual([
    "src/features/game-data/heroes/direct.ts",
    "src/features/game-data/heroes/local.ts",
  ]);
});

test("project rules keep route and public-entrypoint exceptions exact", () => {
  const graph = [
    edge("app/divinity.tsx", "../src/features/game-data/heroes", "src/features/game-data/heroes/index.ts"),
    edge("app/divinity.tsx", "../src/shared/ui/AppErrorBoundary", "src/shared/ui/AppErrorBoundary.tsx"),
    edge("src/features/admin/hook.ts", "../../auth", "src/features/auth/index.ts"),
    edge("src/features/heroes/screen.ts", "@/features/builds/index", "src/features/builds/index.ts"),
  ];

  expect(
    findArchitectureViolations(graph, createProjectArchitectureRules()).map(
      ({ rule }) => rule,
    ),
  ).toEqual([
    "app-routes-must-remain-thin",
    "app-routes-must-remain-thin",
    "cross-feature-import-must-use-approved-owner-api",
    "cross-feature-import-must-use-approved-owner-api",
  ]);
});

function edge(sourceFile, specifier, resolvedTarget) {
  return { external: false, resolvedTarget, sourceFile, specifier };
}
