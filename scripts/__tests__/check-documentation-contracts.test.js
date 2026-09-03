const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  REQUIRED_CAPABILITY_SPECS,
  checkDocumentationContracts,
} = require("../check-documentation-contracts.cjs");

const temporaryProjects = [];

afterEach(() => {
  for (const projectRoot of temporaryProjects.splice(0)) {
    fs.rmSync(projectRoot, { force: true, recursive: true });
  }
});

function createProject(overrides = {}) {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "mh-documentation-fixture-"),
  );
  temporaryProjects.push(projectRoot);

  const files = {
    "AGENTS.md": [
      "# Agent rules",
      "[Catalog](docs/README.md)",
      "[Product contracts](docs/guidelines/product-contracts.md)",
      "[Alpha spec](docs/alpha-spec.md)",
    ].join("\n"),
    "README.md": [
      "# Fixture",
      "[Catalog](docs/README.md)",
      "[Alpha spec](docs/alpha-spec.md)",
    ].join("\n"),
    "app/alpha.tsx": "export default function Alpha() { return null; }\n",
    "app/index.tsx": "export default function Home() { return null; }\n",
    "docs/README.md": [
      "# Catalog",
      "### Alpha",
      "- Маршруты: `/alpha`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Навигационная оболочка",
      "- Маршруты: `/`.",
      "- Контракт: отдельный spec не требуется.",
      "[Guidelines](guidelines/README.md)",
    ].join("\n"),
    "docs/alpha-spec.md": "# Alpha\nМаршруты: `/alpha`.\n[Route](../app/alpha.tsx)\n",
    "docs/guidelines/README.md": [
      "# Guidelines",
      "[Product contracts](product-contracts.md)",
    ].join("\n"),
    "docs/guidelines/product-contracts.md": "# Product contracts\n",
    ...overrides,
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(projectRoot, relativePath);
    if (content === null) {
      continue;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  return projectRoot;
}

function rulesFor(projectRoot) {
  return checkDocumentationContracts({
    projectRoot,
    requiredCapabilitySpecs: ["docs/alpha-spec.md"],
    trackedFiles: [],
  }).map(({ rule }) => rule);
}

test("pins the current seven standalone capability contracts", () => {
  expect(REQUIRED_CAPABILITY_SPECS).toEqual([
    "docs/antique-rivalry-spec.md",
    "docs/divinity-branch-builder-spec.md",
    "docs/divinity-screen-spec.md",
    "docs/divinity-talent-calculator-spec.md",
    "docs/hero-builds-spec.md",
    "docs/summon-rivalry-spec.md",
    "docs/weekly-rivalry-spec.md",
  ]);
});

test("accepts one capability spec per route group and an explicit root exception", () => {
  expect(rulesFor(createProject())).toEqual([]);
});

test("reports a route that is absent from the capability catalog", () => {
  const projectRoot = createProject({
    "app/beta.tsx": "export default function Beta() { return null; }\n",
  });

  expect(rulesFor(projectRoot)).toContain("route-missing-from-catalog");
});

test("reports a catalog route that no longer exists in app", () => {
  const projectRoot = createProject({
    "docs/README.md": [
      "# Catalog",
      "### Alpha",
      "- Маршруты: `/alpha`, `/removed`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Навигационная оболочка",
      "- Маршруты: `/`.",
      "- Контракт: отдельный spec не требуется.",
    ].join("\n"),
    "docs/alpha-spec.md": [
      "# Alpha",
      "Маршруты: `/alpha`, `/removed`.",
      "[Route](../app/alpha.tsx)",
    ].join("\n"),
  });

  expect(rulesFor(projectRoot)).toContain("catalog-route-missing-from-app");
});

test("reports a route assigned to more than one capability", () => {
  const projectRoot = createProject({
    "docs/README.md": [
      "# Catalog",
      "### Alpha",
      "- Маршруты: `/alpha`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Duplicate",
      "- Маршруты: `/alpha`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Навигационная оболочка",
      "- Маршруты: `/`.",
      "- Контракт: отдельный spec не требуется.",
    ].join("\n"),
  });

  expect(rulesFor(projectRoot)).toContain("route-has-multiple-capabilities");
});

test("reports one spec split across multiple capability sections", () => {
  const projectRoot = createProject({
    "app/beta.tsx": "export default function Beta() { return null; }\n",
    "docs/README.md": [
      "# Catalog",
      "### Alpha",
      "- Маршруты: `/alpha`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Beta",
      "- Маршруты: `/beta`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Навигационная оболочка",
      "- Маршруты: `/`.",
      "- Контракт: отдельный spec не требуется.",
    ].join("\n"),
  });

  expect(rulesFor(projectRoot)).toContain("spec-has-multiple-capabilities");
});

test("reports a catalog route omitted from its owning capability spec", () => {
  const projectRoot = createProject({
    "docs/alpha-spec.md": "# Alpha\n[Route](../app/alpha.tsx)\n",
  });

  expect(rulesFor(projectRoot)).toContain("route-missing-from-capability-spec");
});

test("keeps root as the only explicit route without a spec", () => {
  const projectRoot = createProject({
    "docs/README.md": [
      "# Catalog",
      "### Alpha",
      "- Маршруты: `/alpha`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
      "### Root capability",
      "- Маршруты: `/`.",
      "- Контракт: [alpha-spec.md](alpha-spec.md).",
    ].join("\n"),
  });

  expect(rulesFor(projectRoot)).toContain("invalid-root-contract-exception");
});

test("reports a missing catalog spec and an orphan capability spec", () => {
  const projectRoot = createProject({
    "docs/README.md": [
      "# Catalog",
      "### Alpha",
      "- Маршруты: `/alpha`.",
      "- Контракт: [missing-spec.md](missing-spec.md).",
      "### Навигационная оболочка",
      "- Маршруты: `/`.",
      "- Контракт: отдельный spec не требуется.",
    ].join("\n"),
    "docs/orphan-spec.md": "# Orphan\n",
  });

  expect(rulesFor(projectRoot)).toEqual(
    expect.arrayContaining(["catalog-spec-missing", "orphan-spec"]),
  );
});

test("reports a required capability spec even if every mutable index dropped it", () => {
  const projectRoot = createProject({
    "AGENTS.md": [
      "# Agent rules",
      "[Catalog](docs/README.md)",
      "[Product contracts](docs/guidelines/product-contracts.md)",
      "[Beta spec](docs/beta-spec.md)",
    ].join("\n"),
    "README.md": "# Fixture\n[Beta spec](docs/beta-spec.md)\n",
    "docs/README.md": [
      "# Catalog",
      "### Beta",
      "- Маршруты: `/alpha`.",
      "- Контракт: [beta-spec.md](beta-spec.md).",
      "### Навигационная оболочка",
      "- Маршруты: `/`.",
      "- Контракт: отдельный spec не требуется.",
    ].join("\n"),
    "docs/alpha-spec.md": null,
    "docs/beta-spec.md": "# Beta\nМаршруты: `/alpha`.\n",
  });

  expect(rulesFor(projectRoot)).toContain("required-capability-spec-missing");
});

test("reports a broken local Markdown link", () => {
  const projectRoot = createProject({
    "docs/alpha-spec.md": "# Alpha\n[Missing](../src/missing.ts)\n",
  });

  expect(rulesFor(projectRoot)).toContain("broken-local-markdown-link");
});

test("reports broken reference-style targets and Markdown fragments", () => {
  const projectRoot = createProject({
    "docs/alpha-spec.md": [
      "# Alpha",
      "Маршруты: `/alpha`.",
      "[Missing source][implementation]",
      "[Removed section](guide.md#removed-heading)",
      "[implementation]: ../src/not-created-yet.ts",
    ].join("\n"),
    "docs/guide.md": "# Current heading\n",
  });

  expect(rulesFor(projectRoot)).toEqual(
    expect.arrayContaining([
      "broken-local-markdown-link",
      "broken-local-markdown-anchor",
    ]),
  );
});

test("reports a capability spec absent from root README and AGENTS", () => {
  const projectRoot = createProject({
    "AGENTS.md": "# Agent rules\n[Catalog](docs/README.md)\n",
    "README.md": "# Fixture\n[Catalog](docs/README.md)\n",
  });

  expect(rulesFor(projectRoot)).toEqual(
    expect.arrayContaining([
      "spec-missing-from-agents",
      "spec-missing-from-root-readme",
    ]),
  );
});

test("requires AGENTS to point to the catalog and product-contract rules", () => {
  const projectRoot = createProject({
    "AGENTS.md": "# Agent rules\n[Alpha spec](docs/alpha-spec.md)\n",
  });

  expect(rulesFor(projectRoot)).toEqual(
    expect.arrayContaining([
      "catalog-missing-from-agents",
      "product-contract-guideline-missing-from-agents",
    ]),
  );
});

test("reports a guideline absent from the guideline index", () => {
  const projectRoot = createProject({
    "docs/guidelines/code-style.md": "# Code style\n",
  });

  expect(rulesFor(projectRoot)).toContain("guideline-missing-from-index");
});

test("ignores temporary superpowers documentation", () => {
  const projectRoot = createProject({
    "docs/superpowers/plan.md": "[Temporary missing link](missing.md)\n",
  });

  expect(rulesFor(projectRoot)).toEqual([]);
});

test("ignores untracked temporary documentation outside superpowers folders", () => {
  const projectRoot = createProject({
    "docs/implementation-plan.md": "[Future source](../src/not-created-yet.ts)\n",
  });

  expect(rulesFor(projectRoot)).toEqual([]);
});

test("rejects temporary superpowers documentation when Git tracks it", () => {
  const projectRoot = createProject({
    "docs/superpowers/plan.md": "# Temporary plan\n",
  });

  const rules = checkDocumentationContracts({
    projectRoot,
    requiredCapabilitySpecs: ["docs/alpha-spec.md"],
    trackedFiles: ["docs/superpowers/plan.md"],
  }).map(({ rule }) => rule);

  expect(rules).toContain("temporary-documentation-must-not-be-tracked");
});

test.each([
  "docs/implementation-plan.md",
  "docs/implementation plan.md",
  "docs/plan.v2.md",
  "docs/plan(v2).md",
  "docs/[plan].md",
  "docs/plan+notes.md",
  "docs/feature-brainstorming.md",
])("rejects tracked temporary document %s outside superpowers folders", (relativePath) => {
  const projectRoot = createProject({
    [relativePath]: "# Temporary working notes\n",
  });

  const rules = checkDocumentationContracts({
    projectRoot,
    requiredCapabilitySpecs: ["docs/alpha-spec.md"],
    trackedFiles: [relativePath],
  }).map(({ rule }) => rule);

  expect(rules).toContain("temporary-documentation-must-not-be-tracked");
});

test.each([
  "docs/planet-guide.md",
  "docs/explanation.md",
])("does not treat words containing plan as a marker in %s", (relativePath) => {
  const projectRoot = createProject({
    [relativePath]: "# Durable planet guide\n",
  });

  const rules = checkDocumentationContracts({
    projectRoot,
    requiredCapabilitySpecs: ["docs/alpha-spec.md"],
    trackedFiles: [relativePath],
  }).map(({ rule }) => rule);

  expect(rules).not.toContain("temporary-documentation-must-not-be-tracked");
});
