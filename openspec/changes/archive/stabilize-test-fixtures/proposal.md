---
change_type: implementation
priority: high
dependencies: []
references:
  - tests/api/cron.test.ts
  - tests/api/skills.test.ts
  - tests/ui/skills-tree.spec.ts
---

# Stabilize Test Fixtures

**Change Type**: implementation

## Problem / Context

Several tests currently depend on unstable or environment-coupled fixtures. The clearest examples are `tests/api/cron.test.ts`, which uses a fixed `/tmp/cron-test` directory; `tests/api/skills.test.ts`, which derives paths from `process.env.HOME`; and `tests/ui/skills-tree.spec.ts`, which uses an explicit `setTimeout` fallback during page loading.

These patterns increase the risk of flaky behavior, inter-test interference, and environment-specific failures. The suite should prefer unique temporary directories, explicit environment stubbing, and state-based waiting conditions.

## Proposed Solution

Standardize fixture stability rules for the current test suite:

1. Tests that need filesystem scratch space use unique temp directories rather than fixed shared paths.
2. Tests that depend on process-global environment values explicitly stub those values within the test.
3. Browser tests use observable state transitions instead of arbitrary sleep-based fallbacks whenever they are retained.
4. The repository should treat these as baseline stability expectations for future test additions.

## Acceptance Criteria

- `tests/api/cron.test.ts` no longer uses a fixed shared `/tmp` path.
- Tests that depend on the skills root or similar environment-derived paths do so through explicit stubbing or injected test configuration rather than ambient machine state.
- Any retained browser test avoids arbitrary sleep-based waiting when a deterministic page condition is available.
- The resulting fixture patterns reduce order dependence and machine-specific behavior without changing the intended product behavior under test.

## Out of Scope

- Large-scale test helper deduplication
- Reclassifying test suites across runners
- Broad changes to production runtime path resolution beyond what is needed to stabilize tests
