---
change_type: implementation
priority: medium
dependencies: []
references:
  - tests/ui/skills-tree.spec.ts
  - vitest.config.ts
  - playwright.config.ts
  - README.md
---

# Clarify Test Suite Boundaries

**Change Type**: implementation

## Problem / Context

The current repository mixes Vitest unit/component tests and Playwright browser tests under the shared `tests/` tree without a clear boundary. In particular, `tests/ui/skills-tree.spec.ts` is excluded from Vitest by `vitest.config.ts` but still lives next to jsdom-based UI tests. It also assumes a pre-running server and seeded runtime data, which makes its execution model different from the rest of the `tests/ui` suite.

This ambiguity makes the test inventory harder to reason about, causes confusion about which commands execute which tests, and weakens confidence in proposal review and future cleanup work.

## Proposed Solution

Define and document explicit repository rules for test classification:

1. Unit/component tests run under Vitest and remain deterministic without a pre-running app server.
2. Browser-driven end-to-end tests run under Playwright and are stored and documented as E2E tests rather than as part of the default Vitest-oriented suite.
3. Existing browser tests that depend on a running server or seeded runtime state are either relocated into the E2E boundary or removed if they are no longer maintained.
4. Repository documentation and test configuration should make it clear which command covers each class of tests.

## Acceptance Criteria

- The repository defines distinct categories for unit/component tests, integration-style tests, and Playwright E2E tests.
- Browser tests that require a running app server are no longer presented as part of the default Vitest-oriented UI suite.
- The handling of `tests/ui/skills-tree.spec.ts` is explicit: either it is moved into the E2E boundary with matching documentation, or it is removed as an unmaintained browser test.
- Documentation explains which commands run Vitest and which commands run Playwright.
- Future contributors can determine whether a new test belongs in Vitest or Playwright without inferring intent from file extensions alone.

## Out of Scope

- Rewriting unrelated test assertions
- Refactoring fetch mocks or test helpers across the UI suite
- Fixing unrelated flaky fixtures
