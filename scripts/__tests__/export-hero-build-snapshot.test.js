const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");

const scriptPath = path.join(
  process.cwd(),
  "scripts/export-hero-build-snapshot.cjs",
);
const originalResolveFilename = Module._resolveFilename;
const originalTsExtension = require.extensions[".ts"];
const { replaceSnapshotDirectory } = require(scriptPath);

const nextFiles = {
  manifestJson: '{"schemaVersion":1}\n',
  resourceJson: '{"heroBuilds":[]}\n',
};

test("snapshot exporter exposes atomic replacement without running network on import", () => {
  const source = fs.readFileSync(scriptPath, "utf8");

  expect(source).toContain("if (require.main === module)");
  expect(source).toContain("module.exports = { replaceSnapshotDirectory }");
  expect(source).toContain("src/features/builds/data/generated/hero-builds");
  expect(source).not.toContain("src/features/game-data/snapshots");
  expect(Module._resolveFilename).toBe(originalResolveFilename);
  expect(require.extensions[".ts"]).toBe(originalTsExtension);
});

test("atomically replaces the complete generated snapshot pair", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "mh-snapshot-replace-"),
  );
  const target = path.join(directory, "hero-builds");

  try {
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "manifest.json"), "old manifest");
    fs.writeFileSync(path.join(target, "hero-builds.json"), "old resource");

    replaceSnapshotDirectory(nextFiles, target);

    expect(fs.readFileSync(path.join(target, "manifest.json"), "utf8")).toBe(
      nextFiles.manifestJson,
    );
    expect(
      fs.readFileSync(path.join(target, "hero-builds.json"), "utf8"),
    ).toBe(nextFiles.resourceJson);
    expect(fs.readdirSync(directory)).toEqual(["hero-builds"]);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test("restores the previous pair when installing the staged directory fails", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "mh-snapshot-rollback-"),
  );
  const target = path.join(directory, "hero-builds");
  const realRenameSync = fs.renameSync.bind(fs);
  let installFailed = false;
  const rename = jest.spyOn(fs, "renameSync").mockImplementation((from, to) => {
    if (
      !installFailed &&
      to === target &&
      path.basename(String(from)).startsWith(".hero-builds-")
    ) {
      installFailed = true;
      throw new Error("injected install failure");
    }
    return realRenameSync(from, to);
  });

  try {
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "manifest.json"), "old manifest");
    fs.writeFileSync(path.join(target, "hero-builds.json"), "old resource");

    expect(() => replaceSnapshotDirectory(nextFiles, target)).toThrow(
      "injected install failure",
    );

    expect(fs.readFileSync(path.join(target, "manifest.json"), "utf8")).toBe(
      "old manifest",
    );
    expect(
      fs.readFileSync(path.join(target, "hero-builds.json"), "utf8"),
    ).toBe("old resource");
    expect(fs.readdirSync(directory)).toEqual(["hero-builds"]);
  } finally {
    rename.mockRestore();
    fs.rmSync(directory, { force: true, recursive: true });
  }
});
