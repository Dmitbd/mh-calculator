const path = require("node:path");
const ts = require("typescript");

function buildTypeScriptImportGraph({
  projectRoot,
  roots,
  tsconfigPath,
}) {
  return buildTypeScriptProjectGraph({ projectRoot, roots, tsconfigPath }).graph;
}

function buildTypeScriptProjectGraph({
  projectRoot,
  roots,
  tsconfigPath,
}) {
  const absoluteProjectRoot = path.resolve(projectRoot);
  const absoluteConfigPath = path.resolve(absoluteProjectRoot, tsconfigPath);
  const configFile = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(formatDiagnostic(configFile.error));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    absoluteProjectRoot,
    undefined,
    absoluteConfigPath,
  );
  if (parsedConfig.errors.length > 0) {
    throw new Error(parsedConfig.errors.map(formatDiagnostic).join("\n"));
  }

  const absoluteRoots = roots.map((root) =>
    path.resolve(absoluteProjectRoot, root),
  );
  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
  const edges = [];
  const files = [];

  for (const sourceFile of program.getSourceFiles()) {
    const absoluteSourceFile = path.resolve(sourceFile.fileName);
    const relativeSourceFile = toProjectPath(
      absoluteProjectRoot,
      absoluteSourceFile,
    );

    if (
      !relativeSourceFile ||
      !absoluteRoots.some((root) => pathIsWithin(absoluteSourceFile, root)) ||
      isTestSource(relativeSourceFile)
    ) {
      continue;
    }

    files.push(relativeSourceFile);

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      const resolution = ts.resolveModuleName(
        specifier,
        absoluteSourceFile,
        parsedConfig.options,
        ts.sys,
      ).resolvedModule;
      const absoluteTarget = resolution
        ? path.resolve(resolution.resolvedFileName)
        : null;
      const relativeTarget = absoluteTarget
        ? toProjectPath(absoluteProjectRoot, absoluteTarget)
        : null;
      const external =
        relativeTarget === null ||
        relativeTarget.split("/").includes("node_modules");

      edges.push({
        external,
        resolvedTarget: external ? null : relativeTarget,
        sourceFile: relativeSourceFile,
        specifier,
      });
    }
  }

  return {
    files: files.sort(compareText),
    graph: edges.sort(compareEdges),
  };
}

function findArchitectureViolations(graph, rules) {
  const violations = [];

  for (const edge of graph) {
    for (const rule of rules) {
      if (!violatesRule(edge, rule)) {
        continue;
      }

      violations.push({
        importer: edge.sourceFile,
        resolvedTarget: edge.resolvedTarget,
        rule: rule.name,
        specifier: edge.specifier,
      });
    }
  }

  return violations.sort((left, right) =>
    compareText(
      [left.importer, left.specifier, left.rule, left.resolvedTarget ?? ""].join(
        "\0",
      ),
      [right.importer, right.specifier, right.rule, right.resolvedTarget ?? ""].join(
        "\0",
      ),
    ),
  );
}

function violatesRule(edge, rule) {
  if (typeof rule.test === "function") {
    return rule.test(edge);
  }

  const sourceMatches = (rule.from ?? []).some((scope) =>
    pathMatchesScope(edge.sourceFile, scope),
  );
  if (!sourceMatches) {
    return false;
  }

  const targetMatches =
    edge.resolvedTarget !== null &&
    (rule.to ?? []).some((scope) =>
      pathMatchesScope(edge.resolvedTarget, scope),
    );
  const externalMatches =
    edge.external &&
    (rule.externalSpecifiers ?? []).includes(edge.specifier);
  if (!targetMatches && !externalMatches) {
    return false;
  }

  return !(
    edge.resolvedTarget !== null &&
    (rule.allow ?? []).some((scope) =>
      pathMatchesScope(edge.resolvedTarget, scope),
    )
  );
}

function collectModuleSpecifiers(sourceFile) {
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length >= 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function isTestSource(relativePath) {
  return (
    relativePath.split("/").some((segment) =>
      ["__tests__", "testing"].includes(segment),
    ) || /\.(?:test|spec|d)\.[cm]?[jt]sx?$/.test(relativePath)
  );
}

function pathIsWithin(candidate, directory) {
  return candidate === directory || candidate.startsWith(`${directory}${path.sep}`);
}

function pathMatchesScope(candidate, scope) {
  const normalizedScope = scope.replace(/\\/g, "/").replace(/\/$/, "");
  return candidate === normalizedScope || candidate.startsWith(`${normalizedScope}/`);
}

function toProjectPath(projectRoot, absolutePath) {
  if (!pathIsWithin(absolutePath, projectRoot)) {
    return null;
  }
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

function compareEdges(left, right) {
  return compareText(
    [left.sourceFile, left.specifier, left.resolvedTarget ?? ""].join("\0"),
    [right.sourceFile, right.specifier, right.resolvedTarget ?? ""].join("\0"),
  );
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function formatDiagnostic(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

module.exports = {
  buildTypeScriptImportGraph,
  buildTypeScriptProjectGraph,
  findArchitectureViolations,
};
