const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createStaticRequestHandler,
  resolveRequestFile,
} = require("../serve-static-e2e.cjs");

describe("E2E static server", () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "mh-e2e-static-"));
    fs.writeFileSync(path.join(directory, "index.html"), "<h1>ok</h1>");
  });

  afterEach(() => {
    fs.rmSync(directory, { force: true, recursive: true });
  });

  it("rejects traversal, paths outside the base, and malformed encoding", () => {
    expect(resolveRequestFile("/outside", directory)).toEqual({ status: 404 });
    expect(resolveRequestFile("/mh-calculator/%2e%2e/package.json", directory)).toEqual({ status: 404 });
    expect(resolveRequestFile("/mh-calculator/%E0%A4%A", directory)).toEqual({ status: 400 });
  });

  it("serves known MIME types with no-store", () => {
    const handler = createStaticRequestHandler(directory);
    const writeHead = jest.fn();
    const end = jest.fn();

    handler({ url: "/mh-calculator/" }, { end, writeHead });

    expect(writeHead).toHaveBeenCalledWith(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    });
    expect(end).toHaveBeenCalledWith(Buffer.from("<h1>ok</h1>"));
  });
});
