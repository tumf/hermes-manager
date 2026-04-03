## Implementation Tasks

- [x] Extract shared ChatTab test fixtures for repeated `/api/agents`, `/sessions`, `/messages`, and `/chat` fetch routing used across `tests/components/chat-messages.test.tsx`, `tests/components/chat-input.test.tsx`, and `tests/components/session-list.test.tsx` (verification: affected tests import shared helpers and still assert the same behavior).
- [x] Consolidate repeated Env tab fixtures across `tests/ui/agent-env-tab.test.tsx` and `tests/ui/agent-detail-env-tab.test.tsx` so the files vary only the env rows or mutation outcomes they care about (verification: both files use a common helper or fixture builder while preserving their current assertions).
- [x] Simplify `tests/ui/agent-detail-page.test.tsx` by replacing duplicated fetch route branches with a single shared fetch router or fixture builder (verification: no endpoint is defined twice in the same test router and tests still cover Start, tabs, file loading, env, and skills flows).
- [x] Keep helper extraction test-only and local to the test suite so production code remains unchanged (verification: no production module imports new test helpers).
- [x] Run project verification after implementation (verification: `npm run test && npm run typecheck && npm run lint`).

## Future Work

- If additional page tests accumulate similar inline fetch routers, consider a shared `tests/helpers/` convention for mock API routing.
