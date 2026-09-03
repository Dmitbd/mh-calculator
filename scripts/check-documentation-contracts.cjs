const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { listAppRoutes } = require("./lib/appRoutes.cjs");

const MARKDOWN_LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/g;
const MARKDOWN_REFERENCE_TARGET_PATTERN =
  /^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm;
const ROUTE_LINE_PATTERN = /^- Маршруты:\s*(.+)$/m;
const CONTRACT_LINE_PATTERN = /^- Контракт:\s*(.+)$/m;
const REQUIRED_CAPABILITY_SPECS = [
  "docs/antique-rivalry-spec.md",
  "docs/divinity-branch-builder-spec.md",
  "docs/divinity-screen-spec.md",
  "docs/divinity-talent-calculator-spec.md",
  "docs/hero-builds-spec.md",
  "docs/summon-rivalry-spec.md",
  "docs/weekly-rivalry-spec.md",
];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function collectFiles(directory, predicate) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(absolutePath, predicate);
    }
    return predicate(absolutePath) ? [absolutePath] : [];
  });
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseMarkdownTargets(source) {
  return [
    ...Array.from(source.matchAll(MARKDOWN_LINK_PATTERN), ([, rawTarget]) =>
      rawTarget.trim().replace(/^<|>$/g, ""),
    ),
    ...Array.from(
      source.matchAll(MARKDOWN_REFERENCE_TARGET_PATTERN),
      ([, enclosedTarget, plainTarget]) => enclosedTarget ?? plainTarget,
    ),
  ];
}

function parseLocalMarkdownTarget(sourcePath, rawTarget) {
  const target = rawTarget.trim();
  const hashIndex = target.indexOf("#");
  const rawPath = (hashIndex >= 0 ? target.slice(0, hashIndex) : target).trim();
  const rawFragment = hashIndex >= 0 ? target.slice(hashIndex + 1) : "";
  if (
    (rawPath.length === 0 && rawFragment.length === 0) ||
    /^[a-z][a-z\d+.-]*:/i.test(rawPath)
  ) {
    return null;
  }

  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(rawPath);
  } catch {
    decodedTarget = rawPath;
  }
  let decodedFragment;
  try {
    decodedFragment = decodeURIComponent(rawFragment);
  } catch {
    decodedFragment = rawFragment;
  }

  return {
    filePath:
      decodedTarget.length === 0
        ? sourcePath
        : path.resolve(path.dirname(sourcePath), decodedTarget),
    fragment: decodedFragment,
  };
}

function resolveLocalMarkdownTarget(sourcePath, rawTarget) {
  return parseLocalMarkdownTarget(sourcePath, rawTarget)?.filePath ?? null;
}

function collectMarkdownHeadingAnchors(source) {
  const anchors = new Set();
  const counts = new Map();
  for (const [, rawHeading] of source.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    const heading = rawHeading.replace(/\s+#+\s*$/, "");
    const baseAnchor = heading
      .replace(/<[^>]*>/g, "")
      .replace(/[`*_~]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    const duplicateIndex = counts.get(baseAnchor) ?? 0;
    counts.set(baseAnchor, duplicateIndex + 1);
    anchors.add(
      duplicateIndex === 0 ? baseAnchor : `${baseAnchor}-${duplicateIndex}`,
    );
  }
  return anchors;
}

function parseCatalogCapabilities(source) {
  const headings = Array.from(source.matchAll(/^###\s+(.+)$/gm));

  return headings.flatMap((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    const body = source.slice(start, end);
    const routeLine = body.match(ROUTE_LINE_PATTERN)?.[1];
    if (!routeLine) {
      return [];
    }

    return [
      {
        name: heading[1].trim(),
        routes: Array.from(routeLine.matchAll(/`(\/[^`]*)`/g), ([, route]) =>
          route.replace(/\/$/, "") || "/",
        ),
        contract: body.match(CONTRACT_LINE_PATTERN)?.[1] ?? "",
      },
    ];
  });
}

function linkedAbsoluteTargets(sourcePath) {
  return new Set(
    parseMarkdownTargets(readFile(sourcePath))
      .map((target) => resolveLocalMarkdownTarget(sourcePath, target))
      .filter(Boolean),
  );
}

function listTrackedFiles(projectRoot) {
  try {
    return execFileSync("git", ["-C", projectRoot, "ls-files", "-z"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\0")
      .filter(Boolean)
      .map((filePath) => toPosix(filePath));
  } catch {
    return [];
  }
}

function isTemporaryDocumentationPath(relativePath) {
  const normalizedPath = toPosix(relativePath).replace(/^\.\//, "");
  if (
    /^\.superpowers(?:\/|$)/.test(normalizedPath) ||
    /^docs\/superpowers(?:\/|$)/.test(normalizedPath)
  ) {
    return true;
  }

  if (!/\.md$/i.test(normalizedPath)) {
    return false;
  }

  return normalizedPath.split("/").some((segment) => {
    const stem = segment.replace(/\.md$/i, "").toLowerCase();
    const markerBoundary = "[^\\p{L}\\p{N}]";
    return ["brainstorm(?:ing)?", "plans?"].some((marker) =>
      new RegExp(`(^|${markerBoundary})${marker}($|${markerBoundary})`, "u").test(
        stem,
      ),
    );
  });
}

function checkDocumentationContracts({
  projectRoot,
  requiredCapabilitySpecs = REQUIRED_CAPABILITY_SPECS,
  trackedFiles,
}) {
  const root = path.resolve(projectRoot);
  const appDirectory = path.join(root, "app");
  const docsDirectory = path.join(root, "docs");
  const catalogPath = path.join(docsDirectory, "README.md");
  const rootReadmePath = path.join(root, "README.md");
  const agentsPath = path.join(root, "AGENTS.md");
  const guidelineDirectory = path.join(docsDirectory, "guidelines");
  const guidelineIndexPath = path.join(guidelineDirectory, "README.md");
  const violations = [];
  const isTemporaryFile = (filePath) =>
    isTemporaryDocumentationPath(path.relative(root, filePath));
  const report = (rule, file, target) => {
    violations.push({ rule, file: toPosix(path.relative(root, file)), target });
  };

  for (const relativeSpecPath of requiredCapabilitySpecs) {
    const specPath = path.join(root, relativeSpecPath);
    if (!fs.existsSync(specPath)) {
      report(
        "required-capability-spec-missing",
        catalogPath,
        toPosix(relativeSpecPath),
      );
    }
  }

  const currentTrackedFiles = trackedFiles ?? listTrackedFiles(root);
  for (const relativePath of currentTrackedFiles) {
    const normalizedPath = toPosix(relativePath).replace(/^\.\//, "");
    if (
      fs.existsSync(path.join(root, normalizedPath)) &&
      isTemporaryDocumentationPath(normalizedPath)
    ) {
      report(
        "temporary-documentation-must-not-be-tracked",
        path.join(root, normalizedPath),
        normalizedPath,
      );
    }
  }

  const actualRoutes = listAppRoutes(appDirectory);
  const catalogSource = readFile(catalogPath);
  const capabilities = parseCatalogCapabilities(catalogSource);
  const routeOwners = new Map();

  for (const capability of capabilities) {
    for (const route of capability.routes) {
      const owners = routeOwners.get(route) ?? [];
      owners.push(capability.name);
      routeOwners.set(route, owners);
    }
  }

  for (const route of actualRoutes) {
    const owners = routeOwners.get(route) ?? [];
    if (owners.length === 0) {
      report("route-missing-from-catalog", catalogPath, route);
    } else if (owners.length > 1) {
      report("route-has-multiple-capabilities", catalogPath, route);
    }
  }

  for (const route of routeOwners.keys()) {
    if (!actualRoutes.includes(route)) {
      report("catalog-route-missing-from-app", catalogPath, route);
    }
  }

  const specFiles = collectFiles(
    docsDirectory,
    (filePath) =>
      filePath.endsWith("-spec.md") &&
      path.dirname(filePath) === docsDirectory &&
      !isTemporaryFile(filePath),
  );
  const catalogSpecTargets = new Set();
  const specOwners = new Map();

  for (const capability of capabilities) {
    const contractTargets = parseMarkdownTargets(capability.contract)
      .map((target) => resolveLocalMarkdownTarget(catalogPath, target))
      .filter((target) => target?.endsWith("-spec.md"));

    if (capability.routes.includes("/")) {
      if (
        capability.routes.length !== 1 ||
        contractTargets.length !== 0 ||
        !capability.contract.includes("отдельный spec не требуется")
      ) {
        report("invalid-root-contract-exception", catalogPath, capability.name);
      }
      continue;
    }

    if (contractTargets.length !== 1) {
      report("capability-must-have-one-spec", catalogPath, capability.name);
      continue;
    }

    const [specPath] = contractTargets;
    catalogSpecTargets.add(specPath);
    const owners = specOwners.get(specPath) ?? [];
    owners.push(capability.name);
    specOwners.set(specPath, owners);
    if (!fs.existsSync(specPath)) {
      report("catalog-spec-missing", catalogPath, toPosix(path.relative(root, specPath)));
    } else {
      const documentedSpecRoutes = new Set(
        Array.from(
          readFile(specPath).matchAll(/`(\/[^`]*)`/g),
          ([, route]) => route.replace(/\/$/, "") || "/",
        ),
      );
      for (const route of capability.routes) {
        if (!documentedSpecRoutes.has(route)) {
          report("route-missing-from-capability-spec", specPath, route);
        }
      }
    }
  }

  for (const [specPath, owners] of specOwners) {
    if (owners.length > 1) {
      report(
        "spec-has-multiple-capabilities",
        catalogPath,
        toPosix(path.relative(root, specPath)),
      );
    }
  }

  for (const specPath of specFiles) {
    if (!catalogSpecTargets.has(specPath)) {
      report("orphan-spec", specPath, toPosix(path.relative(root, specPath)));
    }
  }

  const requiredIndexes = [
    [agentsPath, "spec-missing-from-agents"],
    [rootReadmePath, "spec-missing-from-root-readme"],
  ];
  for (const specPath of specFiles) {
    for (const [indexPath, rule] of requiredIndexes) {
      if (!linkedAbsoluteTargets(indexPath).has(specPath)) {
        report(rule, indexPath, toPosix(path.relative(root, specPath)));
      }
    }
  }

  const agentTargets = linkedAbsoluteTargets(agentsPath);
  if (!agentTargets.has(catalogPath)) {
    report("catalog-missing-from-agents", agentsPath, "docs/README.md");
  }
  const productContractGuidelinePath = path.join(
    guidelineDirectory,
    "product-contracts.md",
  );
  if (!agentTargets.has(productContractGuidelinePath)) {
    report(
      "product-contract-guideline-missing-from-agents",
      agentsPath,
      "docs/guidelines/product-contracts.md",
    );
  }

  const guidelineTargets = linkedAbsoluteTargets(guidelineIndexPath);
  const guidelineFiles = collectFiles(guidelineDirectory, (filePath) =>
    filePath.endsWith(".md") &&
    filePath !== guidelineIndexPath &&
    !isTemporaryFile(filePath),
  );
  for (const guidelinePath of guidelineFiles) {
    if (!guidelineTargets.has(guidelinePath)) {
      report(
        "guideline-missing-from-index",
        guidelineIndexPath,
        toPosix(path.relative(root, guidelinePath)),
      );
    }
  }

  const markdownFiles = [
    agentsPath,
    rootReadmePath,
    ...collectFiles(
      docsDirectory,
      (filePath) =>
        filePath.endsWith(".md") && !isTemporaryFile(filePath),
    ),
  ];
  for (const markdownPath of markdownFiles) {
    for (const rawTarget of parseMarkdownTargets(readFile(markdownPath))) {
      const localTarget = parseLocalMarkdownTarget(markdownPath, rawTarget);
      if (!localTarget) continue;

      if (!fs.existsSync(localTarget.filePath)) {
        report(
          "broken-local-markdown-link",
          markdownPath,
          toPosix(path.relative(root, localTarget.filePath)),
        );
      } else if (
        localTarget.fragment &&
        localTarget.filePath.endsWith(".md") &&
        !collectMarkdownHeadingAnchors(readFile(localTarget.filePath)).has(
          localTarget.fragment.toLowerCase(),
        )
      ) {
        report(
          "broken-local-markdown-anchor",
          markdownPath,
          `${toPosix(path.relative(root, localTarget.filePath))}#${localTarget.fragment}`,
        );
      }
    }
  }

  return violations.sort((left, right) =>
    [left.rule, left.file, left.target].join("\0").localeCompare(
      [right.rule, right.file, right.target].join("\0"),
    ),
  );
}

function main() {
  const violations = checkDocumentationContracts({ projectRoot: process.cwd() });
  if (violations.length === 0) {
    console.log("Documentation contracts check passed.");
    return;
  }

  for (const violation of violations) {
    console.error(`${violation.rule}: ${violation.file} -> ${violation.target}`);
  }
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_CAPABILITY_SPECS,
  checkDocumentationContracts,
  parseCatalogCapabilities,
};
