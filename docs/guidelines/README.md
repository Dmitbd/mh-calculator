# Project Guidelines

These documents are strict rules for future MH Calculator implementation and refactoring.

## Reading Order

1. Read [product-contracts.md](product-contracts.md) before changing product behavior, routes, screens, forms, or capability specs.
2. Read [documentation-and-releases.md](documentation-and-releases.md) before planning documentation or publishing a version.
3. Read [architecture.md](architecture.md) before moving or creating files.
4. Read [code-style.md](code-style.md) before editing TypeScript, React Native components, hooks, tests, or JSON data.
5. Read [project-patterns.md](project-patterns.md) before changing game data, hero builds, divinity logic, assets, builder flows, or admin tooling.

Before changing build output, CI, runtime loading or error recovery, also follow the performance and operational gates in `documentation-and-releases.md`.

This handbook is complete only when all files listed in the Reading Order exist.

## Authority

- Product specs in `docs/` define user-facing behavior.
- `docs/README.md` inventories shipped application capabilities; `docs/CHANGELOG.md` records released and unreleased user-visible changes.
- Guidelines in this directory define placement, boundaries, style, and repeatable project patterns.
- When a product spec and a guideline appear to conflict, preserve product behavior and update the guideline or refactor plan explicitly.

## Verification Policy

- Current code and new changes MUST follow these guidelines.
- A known exception MUST be narrow, named in the relevant guideline and represented by an executable check where practical.
- `npm run architecture:check` verifies production import boundaries; `npm run docs:check` verifies routes, capability specs, guideline discovery, inline/reference-style local links and Markdown heading fragments.
- A refactor target MUST name a concrete remaining inconsistency. Completed migrations and deleted approaches MUST be removed from the rules instead of remaining as future architecture.
