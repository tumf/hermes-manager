## Implementation Tasks

- [x] Update `src/components/agent-memory-tab.tsx` to derive already-inserted partial references from the active `SOUL.src.md` editor content and filter the `/api/partials` result before rendering candidate buttons. (verification: UI code shows only non-inserted partial buttons for partial mode)
- [x] Ensure partial insertion updates the candidate list immediately after `{{partial:name}}` is inserted so the same partial cannot be selected twice in the same editing pass. (verification: `tests/ui/agent-detail-page.test.tsx` covers post-insert disappearance without reload)
- [x] Add/update Memory tab UI tests for hidden already-inserted partials, visible not-yet-inserted partials, and empty-state rendering when all shared partials are already used. (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx`)
- [x] Run repository verification for the proposal-backed change. (verification: `npm run test && npm run typecheck && npm run lint`)

## Future Work

- Consider whether the UI should also surface a read-only “already inserted partials” section for inspection if operators request it later.
