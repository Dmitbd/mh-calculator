const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { removeGeneratedRouterTypes } = require("../prepare-typecheck.cjs");

describe("typecheck preparation", () => {
  test("removes only the local Expo router declaration", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mh-typecheck-"));
    const typesDirectory = path.join(projectRoot, ".expo", "types");
    const routerDeclaration = path.join(typesDirectory, "router.d.ts");
    const preservedFile = path.join(projectRoot, ".expo", "settings.json");

    fs.mkdirSync(typesDirectory, { recursive: true });
    fs.writeFileSync(routerDeclaration, "stale generated routes");
    fs.writeFileSync(preservedFile, "local settings");

    removeGeneratedRouterTypes(projectRoot);

    expect(fs.existsSync(routerDeclaration)).toBe(false);
    expect(fs.readFileSync(preservedFile, "utf8")).toBe("local settings");

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });
});
