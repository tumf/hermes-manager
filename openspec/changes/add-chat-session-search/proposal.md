---
change_type: implementation
priority: medium
dependencies: []
references:
  - AGENTS.md
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/chat/spec.md
  - /Users/tumf/.hermes/hermes-agent/website/docs/user-guide/features/web-dashboard.md
---

# Add per-agent chat session search

**Change Type**: implementation

## Problem / Context

Hermes Manager already exposes a Chat tab for each managed agent, but operators can only browse sessions linearly and open them one by one. When an agent has many Telegram, tool, and CLI sessions, it becomes slow to answer basic operational questions such as:

- which session mentioned a given incident, customer, or tool failure
- where a specific error string first appeared
- which recent conversation contains the context worth resuming

The upstream Hermes dashboard already proves the usefulness of session full-text search. This capability is worth adopting because it directly improves managed-agent diagnosis inside an agent detail workflow without turning Hermes Manager into a general analytics product.

## Proposed Solution

Add per-agent session search to the Chat workflow.

1. Add a read-only search helper over `{agent.home}/state.db` using the existing SQLite/FTS5 session store.
2. Add `GET /api/agents/{id}/sessions/search?q=...` that returns matching sessions with highlighted snippets and timestamps.
3. Extend the Chat tab with a search input above the session list.
4. Show grouped search results that let the operator open the matching session and jump to the relevant conversation context.

The scope stays intentionally narrow:

- search is limited to one selected managed agent at a time
- results support diagnosis and resume workflows
- no fleet-wide analytics screen is introduced

## Acceptance Criteria

- [ ] Operators can search message content within one managed agent from the Chat tab.
- [ ] Search uses `state.db` FTS data and returns matching session metadata plus highlighted message snippets.
- [ ] Selecting a search result opens the corresponding session and reveals the matching message context.
- [ ] Empty or invalid queries are rejected or treated predictably without scanning the whole database.
- [ ] `npm run test && npm run typecheck && npm run lint` pass after implementation.

## Out of Scope

- Fleet-wide search across all agents
- Session deletion or retention management
- General analytics or cost dashboards
- Replacing the upstream standalone sessions explorer
