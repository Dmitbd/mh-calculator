const fs = require("node:fs");
const path = require("node:path");

const metrics = ["branches", "functions", "lines", "statements"];

function floorPercentage(covered, total) {
  if (!Number.isInteger(covered) || !Number.isInteger(total) || total <= 0) {
    throw new Error("Coverage totals must be positive integers.");
  }
  return Math.floor((covered / total) * 10_000) / 100;
}

function calculateCoverageBaseline(summary) {
  return Object.fromEntries(
    metrics.map((metric) => {
      const value = summary[metric];
      if (!value || typeof value !== "object") {
        throw new Error(`Coverage summary is missing ${metric}.`);
      }
      return [metric, floorPercentage(value.covered, value.total)];
    }),
  );
}

function readCoverageBaseline(summaryPath) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  return calculateCoverageBaseline(summary.total);
}

if (require.main === module) {
  const summaryPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? "coverage/coverage-summary.json",
  );
  process.stdout.write(`${JSON.stringify(readCoverageBaseline(summaryPath))}\n`);
}

module.exports = {
  calculateCoverageBaseline,
  floorPercentage,
  readCoverageBaseline,
};
