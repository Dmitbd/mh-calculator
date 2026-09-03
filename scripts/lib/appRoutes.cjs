const fs = require("node:fs");
const path = require("node:path");

const ROUTE_FILE_PATTERN = /\.(?:[jt]sx?)$/;

function listAppRoutes(appDirectory) {
  return collectRouteFiles(appDirectory)
    .map((filePath) => normalizeRoute(filePath))
    .filter((route) => route !== null)
    .sort();
}

function collectRouteFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);

    return entry.isDirectory()
      ? collectRouteFiles(absolutePath, relativePath)
      : [relativePath];
  });
}

function normalizeRoute(filePath) {
  if (!ROUTE_FILE_PATTERN.test(filePath)) {
    return null;
  }

  const withoutExtension = filePath.replace(ROUTE_FILE_PATTERN, "");
  const segments = withoutExtension.split("/");
  const fileName = segments.at(-1);

  if (fileName === "_layout" || fileName?.startsWith("+")) {
    return null;
  }

  const routeSegments = segments
    .filter((segment) => !/^\(.*\)$/.test(segment))
    .filter((segment, index, values) => {
      return segment !== "index" || index !== values.length - 1;
    });

  return routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;
}

module.exports = { listAppRoutes };
