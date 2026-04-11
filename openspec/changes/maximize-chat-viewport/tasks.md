## Implementation Tasks

- [ ] Update the agent detail tab layout so the Chat tab can expand vertically without extra page stacking (verification: inspect `app/agents/[id]/page.tsx` and confirm Chat tab content uses grow/min-height-safe container structure)
- [ ] Adjust the Chat tab viewport sizing and internal scroll regions to maximize message list height (verification: inspect `src/components/chat-tab.tsx` and confirm viewport-aware height calculation and internal scroll containers)
- [ ] Add or update UI tests covering the Chat tab layout contract (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx tests/components/session-list.test.tsx`)
- [ ] Validate no regressions with full checks (verification: `npm run test && npm run typecheck && npm run lint`)

## Future Work

- Optional follow-up: make the agent header collapsible when Chat is active if even more space is desired on very small screens
