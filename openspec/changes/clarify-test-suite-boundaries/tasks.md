## Implementation Tasks

- [x] Define repository test categories and target directories/configuration boundaries for Vitest vs Playwright (verification: updated docs/config reference concrete paths and commands).
- [x] Reclassify `tests/ui/skills-tree.spec.ts` so its execution model is explicit: move it into the E2E boundary or remove it if it is not intended to be maintained (verification: `tests/ui/skills-tree.spec.ts` removed as unmaintained browser test and Playwright testDir moved to `tests/e2e`).
- [x] Update test runner documentation in `README.md` and any relevant developer guidance so contributors know which command executes each test class (verification: `README.md`, `README_ja.md`, and `CONTRIBUTING.md` now document both `npm run test` and `npm run test:e2e` with scope).
- [x] Ensure default Vitest runs do not implicitly claim coverage for Playwright-only tests (verification: `vitest.config.ts` and repository structure make the separation obvious in code review).
- [x] Run proposal follow-up verification once implemented (verification: `npm run test && npm run typecheck && npm run lint && npm run test:e2e`).

## Future Work

- Consider adding a dedicated npm script for Playwright if the repository wants a single discoverable entrypoint for E2E execution.
