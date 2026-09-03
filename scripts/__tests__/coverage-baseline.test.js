const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  calculateCoverageBaseline,
} = require("../lib/coverageBaseline.cjs");

test("floors every coverage ratio to hundredths", () => {
  expect(
    calculateCoverageBaseline({
      branches: { covered: 2, total: 3 },
      functions: { covered: 1, total: 3 },
      lines: { covered: 8, total: 9 },
      statements: { covered: 5, total: 6 },
    }),
  ).toEqual({
    branches: 66.66,
    functions: 33.33,
    lines: 88.88,
    statements: 83.33,
  });
});

test("Jest rejects an artificially inflated coverage threshold", () => {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "mh-calculator-coverage-threshold-"),
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "subject.js"),
    "exports.choose = (value) => value ? 'yes' : 'no';\n",
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "subject.test.js"),
    "test('covers one branch', () => expect(require('./subject').choose(true)).toBe('yes'));\n",
  );

  let result;
  try {
    result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules/jest/bin/jest.js"),
        "--runInBand",
        "--coverage",
        "--config",
        JSON.stringify({
          collectCoverageFrom: ["subject.js"],
          coverageThreshold: { global: { branches: 100 } },
          rootDir: fixtureRoot,
          testEnvironment: "node",
        }),
      ],
      { cwd: fixtureRoot, encoding: "utf8" },
    );
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }

  expect(result.status).not.toBe(0);
  expect(`${result.stdout}\n${result.stderr}`).toMatch(
    /coverage threshold for branches \(100%\) not met/i,
  );
});
