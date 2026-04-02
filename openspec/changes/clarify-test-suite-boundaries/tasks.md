## Implementation Tasks

- [ ] Define repository test categories and target directories/configuration boundaries for Vitest vs Playwright (verification: updated docs/config reference concrete paths and commands).
- [ ] Reclassify `tests/ui/skills-tree.spec.ts` so its execution model is explicit: move it into the E2E boundary or remove it if it is not intended to be maintained (verification: repository tree and config no longer leave this file in an ambiguous state).
- [ ] Update test runner documentation in `README.md` and any relevant developer guidance so contributors know which command executes each test class (verification: docs mention both `npm run test` and the Playwright execution path with their intended scope).
- [ ] Ensure default Vitest runs do not implicitly claim coverage for Playwright-only tests (verification: `vitest.config.ts` and repository structure make the separation obvious in code review).
- [ ] Run proposal follow-up verification once implemented (verification: `npm run test && npm run typecheck && npm run lint`, plus the documented Playwright command if the E2E test is retained).

## Future Work

- Consider adding a dedicated npm script for Playwright if the repository wants a single discoverable entrypoint for E2E execution.
