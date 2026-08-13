const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), "utf8");

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

  test("provides one install-independent verification command with a clean web export", () => {
    const scripts = JSON.parse(read("package.json")).scripts;

    expect(scripts.typecheck).toBe("tsc --noEmit");
    expect(scripts["expo:check"]).toBe("expo install --check");
    expect(scripts.verify).toContain("npm run expo:check");
    expect(scripts.verify).toContain("jest --runInBand");
    expect(scripts.verify).toContain("npm run typecheck");
    expect(scripts.verify).toContain("npm run export:web:clean");
    expect(scripts.verify).not.toMatch(/npm (ci|install)/);
    expect(scripts["export:web:clean"]).toMatch(/rmSync\(['"]dist['"]/);
    expect(scripts["export:web:clean"]).toContain("npm run export:web");
  });

  test("keeps linked worktrees outside Jest discovery", () => {
    const jestConfig = require(path.join(root, "jest.config.js"));
    expect(jestConfig.testPathIgnorePatterns).toContain("<rootDir>/.worktrees/");
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
});
