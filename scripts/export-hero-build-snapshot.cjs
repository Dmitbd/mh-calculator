#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

async function main() {
  const {
    createHeroBuildSnapshot,
    loadRemoteHeroBuildSnapshot,
    parseHeroBuildSnapshot,
    requestBootstrap,
  } = loadSnapshotRuntime();

  if (process.argv.includes("--from-bundled")) {
    const { heroBuilds } = require("../src/features/game-data/heroes/heroBuilds.ts");
    const files = createHeroBuildSnapshot({
      contentUpdatedAt: "2026-06-22T18:10:50.213000Z",
      contentVersion: "bundled:legacy-20260622",
      heroBuilds: Object.entries(heroBuilds).map(([heroId, buildSet]) => ({
        buildSet,
        heroId,
      })),
    });
    const parsed = parseHeroBuildSnapshot(files.manifestJson, files.resourceJson);
    validateAssets(parsed.heroBuilds);
    replaceSnapshotDirectory(files);
    return;
  }
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
  }
  const config = { url, anonKey };
  const manifest = await requestBootstrap({ config });
  const { files, parsed } = await loadRemoteHeroBuildSnapshot({
    config,
    manifest,
  });
  validateAssets(parsed.heroBuilds);
  replaceSnapshotDirectory(files);
}

function loadSnapshotRuntime() {
  const Module = require("node:module");
  const ts = require("typescript");
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function resolve(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      request = path.join(root, "src", request.slice(2));
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
  require.extensions[".ts"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    module._compile(
      ts.transpileModule(source, {
        compilerOptions: {
          esModuleInterop: true,
          module: ts.ModuleKind.CommonJS,
          resolveJsonModule: true,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: filename,
      }).outputText,
      filename,
    );
  };

  const {
    requestBootstrap,
  } = require("../src/features/builds/data/dataBootstrap.ts");
  const {
    loadRemoteHeroBuildSnapshot,
  } = require("../src/features/builds/data/heroBuildSnapshotRemote.ts");
  const {
    createHeroBuildSnapshot,
    parseHeroBuildSnapshot,
  } = require("../src/features/builds/data/heroBuildSnapshot.ts");
  return {
    createHeroBuildSnapshot,
    loadRemoteHeroBuildSnapshot,
    parseHeroBuildSnapshot,
    requestBootstrap,
  };
}

function validateAssets(entries) {
  for (const { buildSet } of entries) {
    visit(buildSet, (value) => {
      if (typeof value !== "string" || !value.startsWith("/img/")) return;
      const asset = path.join(root, "public", value.slice(1));
      if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
        throw new Error(`Snapshot references a missing asset: ${value}`);
      }
    });
  }
}

function visit(value, callback) {
  callback(value);
  if (Array.isArray(value)) value.forEach((entry) => visit(entry, callback));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => visit(entry, callback));
  }
}

function replaceSnapshotDirectory(
  files,
  target = path.join(
    root,
    "src/features/builds/data/generated/hero-builds",
  ),
) {
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, ".hero-builds-"));
  const backup = `${target}.previous`;
  try {
    fs.writeFileSync(
      path.join(temporary, "hero-builds.json"),
      files.resourceJson,
      { flag: "wx", mode: 0o644 },
    );
    fs.writeFileSync(
      path.join(temporary, "manifest.json"),
      files.manifestJson,
      { flag: "wx", mode: 0o644 },
    );
    fs.rmSync(backup, { force: true, recursive: true });
    if (fs.existsSync(target)) {
      fs.renameSync(target, backup);
    }
    fs.renameSync(temporary, target);
    fs.rmSync(backup, { force: true, recursive: true });
  } catch (error) {
    if (!fs.existsSync(target) && fs.existsSync(backup)) {
      fs.renameSync(backup, target);
    }
    fs.rmSync(temporary, { force: true, recursive: true });
    throw error;
  }
}

if (require.main === module) {
  main().catch(() => {
    process.stderr.write("Hero build snapshot export failed.\n");
    process.exitCode = 1;
  });
}

module.exports = { replaceSnapshotDirectory };
