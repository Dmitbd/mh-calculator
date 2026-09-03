const { createConsoleGuard } = require("../consoleGuard.cjs");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  findConsoleGuardBypasses,
} = require("../consoleGuardPolicy.cjs");

function collectTestFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTestFiles(entryPath);
    }
    return /\.(?:test|spec)\.(?:js|cjs|ts|tsx)$/.test(entry.name)
      ? [entryPath]
      : [];
  });
}

function runTemporaryTest(source) {
  const root = process.cwd();
  const fixtureRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "mh-console-guard-fixture-")),
  );
  const fixturePath = path.join(fixtureRoot, "console-guard.test.js");
  const setupPath = path.join(fixtureRoot, "jest.setup.js");
  fs.writeFileSync(
    setupPath,
    [
      `const { installConsoleGuard } = require(${JSON.stringify(path.join(root, "scripts/testing/consoleGuard.cjs"))});`,
      "installConsoleGuard();",
    ].join("\n"),
  );
  fs.writeFileSync(fixturePath, source);

  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "node_modules/jest/bin/jest.js"),
        "--config",
        JSON.stringify({
          rootDir: fixtureRoot,
          setupFilesAfterEnv: [setupPath],
          testEnvironment: "node",
        }),
        "--runInBand",
        "--runTestsByPath",
        fixturePath,
      ],
      { cwd: fixtureRoot, encoding: "utf8" },
    );
    return { fixturePath, result };
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

describe("console guard", () => {
  test("rejects unexpected console errors and warnings", () => {
    const guard = createConsoleGuard();

    expect(() => guard.error("unexpected error")).toThrow(
      /unexpected console\.error/i,
    );
    expect(() => guard.warn("Warning: unexpected React warning")).toThrow(
      /unexpected console\.warn/i,
    );
  });

  test("consumes one explicitly expected exact call", () => {
    const guard = createConsoleGuard();
    const caughtError = new Error("expected boundary failure");

    guard.expectError("%o boundary", caughtError);

    expect(() => guard.error("%o boundary", caughtError)).not.toThrow();
    expect(() => guard.verify()).not.toThrow();
    expect(() => guard.error("%o boundary", caughtError)).toThrow(
      /unexpected console\.error/i,
    );
  });

  test("does not accept a partial match or an unconsumed expectation", () => {
    const guard = createConsoleGuard();

    guard.expectError("exact message");

    expect(() => guard.error("exact message with suffix")).toThrow(
      /unexpected console\.error/i,
    );
    expect(() => guard.verify()).toThrow(/was not observed/i);
  });

  test("keeps tests from replacing guarded console methods", () => {
    const root = process.cwd();
    const testFiles = ["app", "src", "scripts"].flatMap((directory) =>
      collectTestFiles(path.join(root, directory)),
    );

    for (const filePath of testFiles) {
      if (filePath === __filename) {
        continue;
      }
      const source = fs.readFileSync(filePath, "utf8");
      expect(findConsoleGuardBypasses(source, filePath)).toEqual([]);
    }
  });

  test("detects common guarded-console replacement forms", () => {
    const source = [
      'jest.spyOn(globalThis.console, "error");',
      'console["warn"] = replacement;',
      'Object.defineProperty(console, "error", descriptor);',
      "const consoleAlias = globalThis.console;",
      "consoleAlias.error = replacement;",
      'Object.assign(console, { warn: replacement });',
      'Reflect.set(console, "error", replacement);',
    ].join("\n");

    expect(findConsoleGuardBypasses(source, "fixture.test.js")).toHaveLength(6);
  });

  test("rejects a console error from test module scope", () => {
    const { fixturePath, result } = runTemporaryTest(
      'console.error("module-scope leak");\ntest("fixture", () => {});\n',
    );

    expect(path.relative(process.cwd(), fixturePath).startsWith("..")).toBe(true);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("module-scope leak");
  });

  test("rejects a console error from local teardown", () => {
    const { result } = runTemporaryTest(
      'afterEach(() => console.error("teardown leak"));\ntest("fixture", () => {});\n',
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("teardown leak");
  });

  test("rejects an unconsumed expectation from test module scope", () => {
    const { result } = runTemporaryTest(
      [
        `const { expectConsoleError } = require(${JSON.stringify(path.join(process.cwd(), "scripts/testing/consoleGuard.cjs"))});`,
        'expectConsoleError("never called");',
        'test("fixture", () => {});',
      ].join("\n"),
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "expectConsoleError can only be registered",
    );
  });

  test("rejects an unconsumed expectation from local teardown", () => {
    const { result } = runTemporaryTest(
      [
        `const { expectConsoleError } = require(${JSON.stringify(path.join(process.cwd(), "scripts/testing/consoleGuard.cjs"))});`,
        'afterEach(() => expectConsoleError("never called"));',
        'test("fixture", () => {});',
      ].join("\n"),
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "expectConsoleError can only be registered",
    );
  });
});
