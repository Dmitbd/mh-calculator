const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  checkEntryBundleBudget,
  measureEntryBundle,
} = require("../check-web-bundle-budget.cjs");

describe("web entry bundle budget", () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "mh-bundle-budget-"));
    fs.mkdirSync(path.join(root, "dist/_expo/static/js/web"), {
      recursive: true,
    });
  });

  afterEach(() => {
    fs.rmSync(root, { force: true, recursive: true });
  });

  it("measures the single production entry as raw and gzip bytes", () => {
    fs.writeFileSync(
      path.join(root, "dist/_expo/static/js/web/entry-hash.js"),
      "const stable = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n".repeat(20),
    );

    const measurement = measureEntryBundle(root);

    expect(measurement.file).toBe(
      "dist/_expo/static/js/web/entry-hash.js",
    );
    expect(measurement.rawBytes).toBeGreaterThan(measurement.gzipBytes);
    expect(measurement.rawBytes).toBeGreaterThan(0);
  });

  it("fails closed when the export has zero or multiple entry bundles", () => {
    expect(() => measureEntryBundle(root)).toThrow(/exactly one entry bundle/i);

    fs.writeFileSync(
      path.join(root, "dist/_expo/static/js/web/entry-first.js"),
      "first",
    );
    fs.writeFileSync(
      path.join(root, "dist/_expo/static/js/web/entry-second.js"),
      "second",
    );

    expect(() => measureEntryBundle(root)).toThrow(/exactly one entry bundle/i);
  });

  it("reports every exceeded documented ceiling", () => {
    fs.writeFileSync(
      path.join(root, "dist/_expo/static/js/web/entry-hash.js"),
      "bundle-content-that-does-not-fit",
    );

    expect(() =>
      checkEntryBundleBudget(root, {
        entry: { budget: { gzipBytes: 1, rawBytes: 1 } },
      }),
    ).toThrow(/raw.*gzip/is);
  });

  it("isolates an explicitly named E2E export from the release dist", () => {
    fs.mkdirSync(path.join(root, "dist-e2e/_expo/static/js/web"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, "dist-e2e/_expo/static/js/web/entry-e2e.js"),
      "e2e",
    );
    fs.writeFileSync(
      path.join(root, "dist/_expo/static/js/web/entry-release.js"),
      "release",
    );

    expect(measureEntryBundle(root, "dist-e2e").file).toBe(
      "dist-e2e/_expo/static/js/web/entry-e2e.js",
    );
  });
});
