const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");

function unwrapTransparentExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function findUnusedSuppressions({ root = projectRoot } = {}) {
  const configPath = path.join(root, "tsconfig.production.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    root,
    undefined,
    configPath,
  );
  if (parsedConfig.errors.length > 0) {
    throw new Error(
      parsedConfig.errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        )
        .join("\n"),
    );
  }

  const violations = [];
  for (const filePath of parsedConfig.fileNames) {
    if (!/\.(?:ts|tsx)$/.test(filePath)) continue;

    const source = ts.sys.readFile(filePath);
    if (source === undefined) continue;
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    function visit(node) {
      if (
        ts.isVoidExpression(node) &&
        !ts.isCallExpression(unwrapTransparentExpression(node.expression))
      ) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        violations.push({
          column: character + 1,
          file: path.relative(root, filePath).split(path.sep).join("/"),
          line: line + 1,
        });
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return violations.sort((left, right) =>
    [left.file, left.line, left.column]
      .join(":")
      .localeCompare([right.file, right.line, right.column].join(":")),
  );
}

function main() {
  const requestedRoot = process.argv[2];
  const violations = findUnusedSuppressions({
    root: requestedRoot ? path.resolve(requestedRoot) : projectRoot,
  });
  if (violations.length === 0) {
    console.log("Unused-suppression check passed.");
    return;
  }

  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line}:${violation.column} standalone void without a call hides an unused symbol`,
    );
  }
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = { findUnusedSuppressions };
