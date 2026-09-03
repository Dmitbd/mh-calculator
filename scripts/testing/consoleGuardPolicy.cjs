const ts = require("typescript");

const guardedMethods = new Set(["error", "warn"]);

function unwrapExpression(node) {
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

function getStaticPropertyName(node) {
  const expression = unwrapExpression(node);
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    (ts.isStringLiteral(expression.argumentExpression) ||
      ts.isNoSubstitutionTemplateLiteral(expression.argumentExpression))
  ) {
    return expression.argumentExpression.text;
  }
  return null;
}

function getObjectExpression(node) {
  const expression = unwrapExpression(node);
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.expression;
  }
  if (ts.isElementAccessExpression(expression)) {
    return expression.expression;
  }
  return null;
}

function isConsoleObject(node, aliases = new Set()) {
  const expression = unwrapExpression(node);
  if (
    ts.isIdentifier(expression) &&
    (expression.text === "console" || aliases.has(expression.text))
  ) {
    return true;
  }

  const object = getObjectExpression(expression);
  const property = getStaticPropertyName(expression);
  return (
    property === "console" &&
    object !== null &&
    ts.isIdentifier(unwrapExpression(object)) &&
    ["global", "globalThis"].includes(unwrapExpression(object).text)
  );
}

function isGuardedConsoleMember(node, aliases) {
  const object = getObjectExpression(node);
  const property = getStaticPropertyName(node);
  return (
    object !== null &&
    guardedMethods.has(property) &&
    isConsoleObject(object, aliases)
  );
}

function isAssignmentOperator(kind) {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function isNamedCall(node, ownerNames, methodNames) {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const callee = unwrapExpression(node.expression);
  const owner = getObjectExpression(callee);
  const method = getStaticPropertyName(callee);
  return (
    owner !== null &&
    ts.isIdentifier(unwrapExpression(owner)) &&
    ownerNames.has(unwrapExpression(owner).text) &&
    methodNames.has(method)
  );
}

function hasGuardedMethodArgument(node, aliases) {
  if (
    node.arguments.length < 2 ||
    !isConsoleObject(node.arguments[0], aliases)
  ) {
    return false;
  }
  const method = unwrapExpression(node.arguments[1]);
  return (
    (ts.isStringLiteral(method) || ts.isNoSubstitutionTemplateLiteral(method)) &&
    guardedMethods.has(method.text)
  );
}

function findConsoleGuardBypasses(source, fileName = "test.ts") {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];
  const consoleAliases = new Set();

  function collectAliases(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isConsoleObject(node.initializer, consoleAliases)
    ) {
      consoleAliases.add(node.name.text);
    }
    ts.forEachChild(node, collectAliases);
  }

  collectAliases(sourceFile);

  function report(node, rule) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({
      column: position.character + 1,
      file: fileName,
      line: position.line + 1,
      rule,
    });
  }

  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      isAssignmentOperator(node.operatorToken.kind) &&
      isGuardedConsoleMember(node.left, consoleAliases)
    ) {
      report(node, "guarded console method assignment");
    } else if (
      ts.isDeleteExpression(node) &&
      isGuardedConsoleMember(node.expression, consoleAliases)
    ) {
      report(node, "guarded console method deletion");
    } else if (
      (isNamedCall(node, new Set(["jest"]), new Set(["spyOn", "replaceProperty"])) ||
        isNamedCall(
          node,
          new Set(["Object", "Reflect"]),
          new Set(["defineProperty"]),
        )) &&
      hasGuardedMethodArgument(node, consoleAliases)
    ) {
      report(node, "guarded console method replacement");
    } else if (
      isNamedCall(node, new Set(["Reflect"]), new Set(["set"])) &&
      hasGuardedMethodArgument(node, consoleAliases)
    ) {
      report(node, "guarded console method replacement");
    } else if (
      isNamedCall(node, new Set(["Object"]), new Set(["assign"])) &&
      node.arguments.length > 0 &&
      isConsoleObject(node.arguments[0], consoleAliases)
    ) {
      report(node, "guarded console object mutation");
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

module.exports = { findConsoleGuardBypasses };
