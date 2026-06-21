# Project Guidelines

These documents are strict rules for future MH Calculator implementation and refactoring.

## Reading Order

1. Read `architecture.md` before moving or creating files.
2. Read `code-style.md` before editing TypeScript, React Native components, hooks, tests, or JSON data.
3. Read `project-patterns.md` before changing game data, hero builds, divinity logic, assets, builder flows, or admin tooling.

## Authority

- Product specs in `docs/` define user-facing behavior.
- Guidelines in this directory define placement, boundaries, style, and repeatable project patterns.
- When a product spec and a guideline appear to conflict, preserve product behavior and update the guideline or refactor plan explicitly.

## Transition Policy

The current codebase does not yet satisfy every target rule.

- New code MUST follow these guidelines.
- Refactors SHOULD move existing code toward these guidelines.
- Current violations MUST be listed as refactor targets instead of copied into new code.
