const fs = require("node:fs");
const path = require("node:path");

function removeGeneratedRouterTypes(projectRoot) {
  fs.rmSync(path.join(projectRoot, ".expo", "types", "router.d.ts"), { force: true });
}

if (require.main === module) {
  removeGeneratedRouterTypes(process.cwd());
}

module.exports = { removeGeneratedRouterTypes };
