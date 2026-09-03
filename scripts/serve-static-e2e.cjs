const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_PATH = "/mh-calculator";
const DIST_DIRECTORY = path.resolve(process.cwd(), "dist-e2e");
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function resolveRequestFile(requestUrl, directory = DIST_DIRECTORY) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, `http://${HOST}`).pathname);
  } catch {
    return { status: 400 };
  }
  if (pathname !== BASE_PATH && !pathname.startsWith(`${BASE_PATH}/`)) {
    return { status: 404 };
  }

  const relativePath = pathname.slice(BASE_PATH.length).replace(/^\/+/, "");
  const candidates = relativePath === ""
    ? ["index.html"]
    : path.extname(relativePath)
      ? [relativePath]
      : [`${relativePath}.html`, path.join(relativePath, "index.html")];

  for (const candidate of candidates) {
    const absolutePath = path.resolve(directory, candidate);
    if (
      absolutePath.startsWith(`${directory}${path.sep}`) &&
      fs.existsSync(absolutePath) &&
      fs.statSync(absolutePath).isFile()
    ) {
      return { file: absolutePath, status: 200 };
    }
  }
  return { status: 404 };
}

function createStaticRequestHandler(directory = DIST_DIRECTORY) {
  return (request, response) => {
    const resolution = resolveRequestFile(request.url ?? "/", directory);
    if (resolution.status !== 200 || !resolution.file) {
      const message = resolution.status === 400 ? "Bad request" : "Not found";
      response.writeHead(resolution.status, {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(message);
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": CONTENT_TYPES[path.extname(resolution.file)] ?? "application/octet-stream",
    });
    response.end(fs.readFileSync(resolution.file));
  };
}

function startStaticServer() {
  const server = http.createServer(createStaticRequestHandler());
  server.listen(PORT, HOST, () => {
    console.log(`E2E static server: http://${HOST}:${PORT}${BASE_PATH}/`);
  });

  function close() {
    server.close(() => process.exit(0));
  }
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  return server;
}

if (require.main === module) {
  startStaticServer();
}

module.exports = {
  DIST_DIRECTORY,
  createStaticRequestHandler,
  resolveRequestFile,
  startStaticServer,
};
