# Project Guidelines

These documents are strict rules for future MH Calculator implementation and refactoring.

## Reading Order

1. Read `documentation-and-releases.md` before planning documentation, changing product behavior, or publishing a version.
2. Read `architecture.md` before moving or creating files.
3. Read `code-style.md` before editing TypeScript, React Native components, hooks, tests, or JSON data.
4. Read `project-patterns.md` before changing game data, hero builds, divinity logic, assets, builder flows, or admin tooling.

Before changing build output, CI, runtime loading or error recovery, also follow the performance and operational gates in `documentation-and-releases.md`.

This handbook is complete only when all files listed in the Reading Order exist.

## Authority

- Product specs in `docs/` define user-facing behavior.
- `docs/README.md` inventories shipped application capabilities; `docs/CHANGELOG.md` records released and unreleased user-visible changes.
- Guidelines in this directory define placement, boundaries, style, and repeatable project patterns.
- When a product spec and a guideline appear to conflict, preserve product behavior and update the guideline or refactor plan explicitly.

## Transition Policy

The current codebase does not yet satisfy every target rule.

- New code MUST follow these guidelines.
- Refactors SHOULD move existing code toward these guidelines.
- Current violations MUST be listed as refactor targets instead of copied into new code.
