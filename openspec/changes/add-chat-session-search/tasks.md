## Implementation Tasks

- [x] Add `searchSessionMessages()` helper to `src/lib/state-db.ts` using the existing FTS-backed `state.db` schema.
      verification: unit tests cover empty DB, valid matches, source filtering, limit handling, and snippet formatting.
- [x] Add `GET /api/agents/[id]/sessions/search` with zod query validation and agent path safety checks.
      verification: API tests cover 404 agent, 400 invalid query, and successful search results.
- [x] Extend `src/hooks/use-chat-flow.ts` to manage search query, result loading, result selection, and return-to-session-list behavior.
      verification: hook-driven UI tests cover query entry, clearing search, and selecting a search result.
- [x] Update `src/components/chat-tab.tsx` to render a search box and matching result list without hiding the existing new-chat and source filter controls.
      verification: component tests assert search UI rendering, result previews, and session-opening behavior.
- [x] Update `docs/requirements.md` and `docs/design.md` so Chat explicitly includes per-agent session search as an operational diagnostic tool.
      verification: docs mention the new API and Chat-tab workflow.
- [x] Run `npm run test && npm run typecheck && npm run lint`.
      verification: all commands pass.

## Acceptance #1 Failure Follow-up

- [x] Sanitize FTS5 snippet HTML in `src/components/chat-tab.tsx` by replacing `dangerouslySetInnerHTML` with a safe `renderSnippet()` helper that parses `<mark>`/`</mark>` boundaries and renders them as React elements, escaping all other content.

## Future Work

- Consider message-level highlight persistence after session reload if operators need stronger incident triage support.
- Evaluate session deletion separately as an independent change if real operational demand appears.
