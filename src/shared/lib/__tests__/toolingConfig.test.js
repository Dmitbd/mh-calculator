const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), "utf8");

function createTypeScriptFixtureProject() {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "mh-unused-code-fixture-"),
  );
  fs.copyFileSync(
    path.join(root, "tsconfig.json"),
    path.join(fixtureRoot, "tsconfig.json"),
  );
  fs.copyFileSync(
    path.join(root, "tsconfig.production.json"),
    path.join(fixtureRoot, "tsconfig.production.json"),
  );
  fs.symlinkSync(path.join(root, "node_modules"), path.join(fixtureRoot, "node_modules"));
  return fixtureRoot;
}

describe("reproducible project tooling", () => {
  test("pins the same exact Node and npm versions for local and CI use", () => {
    const packageJson = JSON.parse(read("package.json"));
    const nodeVersion = read(".nvmrc").trim();

    expect(nodeVersion).toBe("24.19.0");
    expect(packageJson.engines).toEqual({ node: "24.19.0", npm: "11.17.0" });
    expect(packageJson.packageManager).toBe("npm@11.17.0");

    for (const workflow of [
      ".github/workflows/verify.yml",
      ".github/workflows/deploy-pages.yml",
      ".github/workflows/update-hero-build-snapshot.yml",
    ]) {
      const source = read(workflow);
      expect(source).toContain(`node-version: ${nodeVersion}`);
      expect(source).toMatch(/npm --version/);
      expect(source).toContain(packageJson.engines.npm);
    }
  });

  test("keeps the lockfile root metadata and Expo SDK 56 package ranges synchronized", () => {
    const packageJson = JSON.parse(read("package.json"));
    const lockRoot = JSON.parse(read("package-lock.json")).packages[""];
    const compatiblePackages = [
      "expo",
      "expo-constants",
      "expo-linking",
      "expo-router",
      "react-native-screens",
    ];

    expect(lockRoot.engines).toEqual(packageJson.engines);
    for (const packageName of compatiblePackages) {
      expect(lockRoot.dependencies[packageName]).toBe(packageJson.dependencies[packageName]);
    }
    expect(lockRoot.devDependencies["jest-expo"]).toBe(packageJson.devDependencies["jest-expo"]);
  });

  test("keeps the Metro toolchain on the audited compatible patch", () => {
    const packageJson = JSON.parse(read("package.json"));
    const lockPackages = JSON.parse(read("package-lock.json")).packages;
    const metroPackages = [
      "metro",
      "metro-babel-transformer",
      "metro-cache",
      "metro-cache-key",
      "metro-config",
      "metro-core",
      "metro-file-map",
      "metro-minify-terser",
      "metro-resolver",
      "metro-runtime",
      "metro-source-map",
      "metro-symbolicate",
      "metro-transform-plugins",
      "metro-transform-worker",
      "ob1",
    ];

    for (const packageName of metroPackages) {
      expect(packageJson.overrides[packageName]).toBe("0.84.5");
      expect(lockPackages[`node_modules/${packageName}`].version).toBe("0.84.5");
    }
    expect(lockPackages["node_modules/image-size"]).toBeUndefined();
  });

  test("provides one install-independent verification command with a clean web export", () => {
    const scripts = JSON.parse(read("package.json")).scripts;

    expect(scripts.typecheck).toBe("node scripts/prepare-typecheck.cjs && tsc --noEmit");
    expect(scripts["expo:check"]).toBe("expo install --check");
    expect(scripts["architecture:check"]).toBe(
      "node scripts/check-architecture.cjs",
    );
    expect(scripts["docs:check"]).toBe(
      "node scripts/check-documentation-contracts.cjs",
    );
    expect(scripts.verify).toContain("npm run expo:check");
    expect(scripts.verify).toContain("npm run architecture:check");
    expect(scripts.verify).toContain("npm run docs:check");
    expect(scripts.verify).toContain("npm run test:ci");
    expect(scripts.verify).toContain("npm run typecheck");
    expect(scripts.verify).toContain("npm run export:web:clean");
    expect(scripts.verify).not.toMatch(/npm (ci|install)/);
    expect(scripts["export:web:clean"]).toMatch(/rmSync\(['"]dist['"]/);
    expect(scripts["export:web:clean"]).toContain("npm run export:web");
  });

  test("keeps the unused-code gate limited to production TypeScript", () => {
    const config = JSON.parse(read("tsconfig.production.json"));
    const scripts = JSON.parse(read("package.json")).scripts;

    expect(config.extends).toBe("./tsconfig.json");
    expect(config.compilerOptions).toEqual(
      expect.objectContaining({
        incremental: false,
        noEmit: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      }),
    );
    expect(config.include).toEqual([
      "app/**/*.ts",
      "app/**/*.tsx",
      "src/**/*.ts",
      "src/**/*.tsx",
      "expo-env.d.ts",
    ]);
    expect(config.exclude).toEqual(
      expect.arrayContaining([
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "src/**/testing/**",
        "src/features/builds/data/generated/**",
        "e2e/**",
      ]),
    );
    expect(scripts["typecheck:unused"]).toBe(
      "node scripts/check-unused-suppressions.cjs && tsc -p tsconfig.production.json",
    );
    expect(scripts.verify.indexOf("npm run typecheck")).toBeLessThan(
      scripts.verify.indexOf("npm run typecheck:unused"),
    );
  });

  test("unused-code command rejects a temporary production-only unused symbol", () => {
    const fixtureRoot = createTypeScriptFixtureProject();
    const fixtureName = `stage11-unused-${process.pid}-${Date.now()}.ts`;
    const fixturePath = path.join(fixtureRoot, "src", fixtureName);
    const testFixtureName = fixtureName.replace(/\.ts$/, ".test.ts");
    const testFixturePath = path.join(
      fixtureRoot,
      "src/shared/lib/__tests__",
      testFixtureName,
    );
    expect(path.relative(root, fixturePath).startsWith("..")).toBe(true);
    expect(path.relative(root, testFixturePath).startsWith("..")).toBe(true);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.mkdirSync(path.dirname(testFixturePath), { recursive: true });
    fs.writeFileSync(
      fixturePath,
      [
        "export {};",
        "const temporaryUnusedValue = 1;",
        "function temporaryUnusedFunction() {",
        "  return temporaryUnusedValue;",
        "}",
      ].join("\n"),
    );
    fs.writeFileSync(
      testFixturePath,
      "const excludedUnusedTestHelper = 1;\n",
    );

    let result;
    try {
      result = spawnSync(
        process.execPath,
        [
          path.join(root, "node_modules/typescript/bin/tsc"),
          "-p",
          "tsconfig.production.json",
          "--pretty",
          "false",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
    } finally {
      fs.rmSync(fixtureRoot, { force: true, recursive: true });
    }

    expect(result.status).not.toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain(fixtureName);
    expect(output).not.toContain(testFixtureName);
    expect(output).toContain(
      "is declared but its value is never read",
    );
  });

  test("unused-code gate rejects a standalone void suppression", () => {
    const fixtureRoot = createTypeScriptFixtureProject();
    const fixtureName = `stage11-void-${process.pid}-${Date.now()}.ts`;
    const fixturePath = path.join(fixtureRoot, "src", fixtureName);
    expect(path.relative(root, fixturePath).startsWith("..")).toBe(true);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(
      fixturePath,
      [
        "const hiddenUnusedValue = 1;",
        "(void (hiddenUnusedValue as number));",
      ].join("\n"),
    );

    let result;
    try {
      result = spawnSync(
        process.execPath,
        [path.join(root, "scripts/check-unused-suppressions.cjs"), fixtureRoot],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
    } finally {
      fs.rmSync(fixtureRoot, { force: true, recursive: true });
    }

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(fixtureName);
  });

  test("keeps linked worktrees outside Jest discovery and the module map", () => {
    const jestConfig = require(path.join(root, "jest.config.js"));

    expect(jestConfig.roots).toEqual([
      "<rootDir>/app",
      "<rootDir>/src",
      "<rootDir>/scripts",
    ]);
    expect(jestConfig.testPathIgnorePatterns).toContain("<rootDir>/.worktrees/");
    expect(jestConfig.modulePathIgnorePatterns).toContain(
      "<rootDir>/.worktrees/",
    );
    expect(jestConfig.watchPathIgnorePatterns).toContain(
      "<rootDir>/.worktrees/",
    );
    expect(jestConfig.setupFiles).toBeUndefined();
    expect(jestConfig.setupFilesAfterEnv).toEqual([
      "<rootDir>/jest.setup.js",
    ]);
  });

  test("does not discover a linked-worktree package fixture", () => {
    const fixtureRoot = path.join(
      root,
      ".worktrees",
      `stage12-jest-${process.pid}-${Date.now()}`,
    );
    const fixtureTest = path.join(fixtureRoot, "__tests__", "leak.test.js");
    fs.mkdirSync(path.dirname(fixtureTest), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, "package.json"),
      `${JSON.stringify({ name: "mh-calculator" })}\n`,
    );
    fs.writeFileSync(fixtureTest, "test('must stay undiscovered', () => {});\n");

    let result;
    try {
      result = spawnSync(
        process.execPath,
        [
          path.join(root, "node_modules/jest/bin/jest.js"),
          "--listTests",
          "--runInBand",
          "--json",
        ],
        { cwd: root, encoding: "utf8" },
      );
    } finally {
      fs.rmSync(fixtureRoot, { force: true, recursive: true });
    }

    expect(result.status).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(fixtureTest);
    expect(`${result.stdout}\n${result.stderr}`).not.toMatch(/haste.*collision/i);
  });

  test("measures the complete production graph once in CI", () => {
    const jestConfig = require(path.join(root, "jest.config.js"));
    const scripts = JSON.parse(read("package.json")).scripts;

    expect(jestConfig.collectCoverageFrom).toEqual([
      "app/**/*.{ts,tsx}",
      "src/**/*.{ts,tsx}",
      "!**/__tests__/**",
      "!**/*.test.{ts,tsx}",
      "!**/*.spec.{ts,tsx}",
      "!src/**/testing/**",
      "!**/*.d.ts",
      "!src/features/builds/data/generated/**",
    ]);
    expect(jestConfig.coverageReporters).toEqual([
      "text-summary",
      "json-summary",
      "lcov",
    ]);
    expect(scripts["test:ci"]).toBe("jest --runInBand --coverage");
    expect(scripts.verify).toContain("npm run test:ci");
    expect(scripts.verify).not.toContain("jest --runInBand");
  });

  test("keeps all four global coverage ratchets enabled", () => {
    const jestConfig = require(path.join(root, "jest.config.js"));

    expect(Object.keys(jestConfig.coverageThreshold.global).sort()).toEqual([
      "branches",
      "functions",
      "lines",
      "statements",
    ]);
    for (const threshold of Object.values(jestConfig.coverageThreshold.global)) {
      expect(threshold).toBeGreaterThan(0);
      expect(Number.isFinite(threshold)).toBe(true);
    }
  });

  test("runs the shared verification command in least-privilege PR CI", () => {
    const source = read(".github/workflows/verify.yml");

    expect(source).toMatch(/on:\s*[\s\S]*pull_request:/);
    expect(source).toMatch(/permissions:\s*\n\s+contents: read/);
    expect(source).not.toMatch(/contents: write|pages: write|id-token: write|pull-requests: write/);
    expect(source).toMatch(/concurrency:[\s\S]*cancel-in-progress: true/);
    expect(source).toMatch(/npm ci[\s\S]*npm run verify/);
    expect(source.match(/npm run verify/g)).toHaveLength(1);
  });

  test("gates the Pages artifact and deployment on the same verification command", () => {
    const source = read(".github/workflows/deploy-pages.yml");

    expect(source).toMatch(/verify:\s*[\s\S]*run: npm run verify/);
    expect(source).toMatch(/build:\s*[\s\S]*needs: verify/);
    expect(source).toMatch(/deploy:\s*[\s\S]*needs: build/);
    expect(source).toMatch(/verify:\s*[\s\S]*permissions:\s*\n\s+contents: read/);
    expect(source).toMatch(/deploy:\s*[\s\S]*permissions:[\s\S]*pages: write[\s\S]*id-token: write/);
    expect(source).toMatch(
      /name: Export web build[\s\S]*run: npm run export:web:clean[\s\S]*name: Check deployed bundle budget[\s\S]*run: npm run budget:web[\s\S]*uses: actions\/upload-pages-artifact/,
    );
  });

  test("pins every third-party action in project workflows to an immutable SHA", () => {
    const workflowDirectory = path.join(root, ".github/workflows");
    const workflowSources = fs
      .readdirSync(workflowDirectory)
      .filter((fileName) => /\.ya?ml$/.test(fileName))
      .map((fileName) => read(path.join(".github/workflows", fileName)));

    for (const source of workflowSources) {
      for (const action of source.matchAll(/uses:\s*([^\s#]+)/g)) {
        expect(action[1]).toMatch(/^[^@\s]+@[a-f0-9]{40}$/);
      }
    }
  });

  test("checks npm and GitHub Actions updates weekly with bounded PR volume", () => {
    const source = read(".github/dependabot.yml");

    expect(source).toContain('package-ecosystem: "npm"');
    expect(source).toContain('package-ecosystem: "github-actions"');
    expect(source.match(/interval: "weekly"/g)).toHaveLength(2);
    expect(source.match(/open-pull-requests-limit: 5/g)).toHaveLength(2);
  });

  test("documents the reproducible release gate and non-forced audit policy", () => {
    const source = read("docs/guidelines/documentation-and-releases.md");

    expect(source).toContain("npm ci");
    expect(source).toContain("npm run verify");
    expect(source).toContain("npm audit --omit=dev");
    expect(source).toMatch(/нельзя[^\n]+npm audit fix --force/i);
  });

  test("documents the browser install required before local E2E", () => {
    const source = read("README.md");

    expect(source).toMatch(
      /npx playwright install chromium[\s\S]*npm run e2e/,
    );
  });

  test("never reuses an unknown server for operational E2E", () => {
    const source = read("playwright.config.ts");

    expect(source).toMatch(/reuseExistingServer:\s*false/);
    expect(source).not.toContain("!process.env.CI");
  });

  test("documents exact-SHA workflow and latest-release verification", () => {
    const source = read("docs/guidelines/documentation-and-releases.md");

    expect(source).toMatch(
      /gh run list[^\n]+--commit <verified-sha>/,
    );
    expect(source).toMatch(/gh run view <run-id>[^\n]+headSha/);
    expect(source).toContain(
      "gh api repos/Dmitbd/mh-calculator/releases/latest",
    );
  });

  test("keeps bundle ceilings in one executable source", () => {
    const backlog = read("docs/BACKLOG.md");
    const budget = JSON.parse(read("scripts/web-bundle-budget.json"));

    expect(backlog).toContain("scripts/web-bundle-budget.json");
    expect(backlog).not.toMatch(/2\s*260\s*000|510\s*000/);
    expect(budget.entry.budget).toEqual({
      rawBytes: 2_260_000,
      gzipBytes: 510_000,
    });
  });

  test("keeps web exports independent from developer dotenv files", () => {
    const scripts = JSON.parse(read("package.json")).scripts;

    expect(scripts["export:web"]).toMatch(
      /^EXPO_NO_DOTENV=1 expo export --platform web --clear$/,
    );
    expect(scripts["e2e:prepare"]).toMatch(
      /&& EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=/,
    );
    expect(scripts["e2e:prepare"]).toContain(
      "EXPO_PUBLIC_SUPABASE_URL=https://e2e.invalid",
    );
    expect(scripts["e2e:prepare"]).toContain(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY=e2e-public-anon-key",
    );
  });
});
