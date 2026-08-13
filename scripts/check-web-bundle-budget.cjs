const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function measureEntryBundle(rootDirectory = process.cwd(), outputDirectory = "dist") {
  const bundleDirectory = path.join(
    rootDirectory,
    outputDirectory,
    "_expo/static/js/web",
  );
  const entries = fs.existsSync(bundleDirectory)
    ? fs
        .readdirSync(bundleDirectory)
        .filter((name) => /^entry-[a-z0-9]+\.js$/i.test(name))
        .sort()
    : [];

  if (entries.length !== 1) {
    throw new Error(
      `Expected exactly one entry bundle, found ${entries.length}. Run the clean production web export first.`,
    );
  }

  const absoluteFile = path.join(bundleDirectory, entries[0]);
  const content = fs.readFileSync(absoluteFile);

  return {
    file: path.relative(rootDirectory, absoluteFile),
    gzipBytes: zlib.gzipSync(content, { level: 9 }).byteLength,
    rawBytes: content.byteLength,
  };
}

function checkEntryBundleBudget(rootDirectory, configuration, outputDirectory) {
  const measurement = measureEntryBundle(rootDirectory, outputDirectory);
  const { gzipBytes, rawBytes } = configuration.entry.budget;
  const violations = [];

  if (measurement.rawBytes > rawBytes) {
    violations.push(
      `raw ${measurement.rawBytes} B exceeds ${rawBytes} B`,
    );
  }
  if (measurement.gzipBytes > gzipBytes) {
    violations.push(
      `gzip ${measurement.gzipBytes} B exceeds ${gzipBytes} B`,
    );
  }

  if (violations.length > 0) {
    throw new Error(`Web entry bundle budget exceeded: ${violations.join("; ")}.`);
  }

  return measurement;
}

function run() {
  const rootDirectory = process.cwd();
  const outputDirectory = process.argv[2] ?? "dist";
  const configuration = JSON.parse(
    fs.readFileSync(
      path.join(rootDirectory, "scripts/web-bundle-budget.json"),
      "utf8",
    ),
  );
  const measurement = checkEntryBundleBudget(
    rootDirectory,
    configuration,
    outputDirectory,
  );
  console.log(
    `Web entry bundle ${measurement.file}: raw ${measurement.rawBytes}/${configuration.entry.budget.rawBytes} B, gzip ${measurement.gzipBytes}/${configuration.entry.budget.gzipBytes} B.`,
  );
}

if (require.main === module) {
  try {
    run();
  } catch (caught) {
    console.error(caught instanceof Error ? caught.message : String(caught));
    process.exitCode = 1;
  }
}

module.exports = {
  checkEntryBundleBudget,
  measureEntryBundle,
};
