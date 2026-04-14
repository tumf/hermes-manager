# Per-agent chat session search design

## Overview

This change adds focused search to Hermes Manager's existing per-agent Chat tab. The implementation should reuse the agent-local `state.db` and its FTS5 tables instead of introducing a second index.

## Data access

### SQLite / FTS5

`state.db` already contains:

- `sessions`
- `messages`
- `messages_fts`

Search should query `messages_fts` and join back to `messages` and `sessions` so the UI receives:

- `sessionId`
- `session title`
- `source`
- `message timestamp`
- `message role`
- a highlighted or snippet-formatted excerpt

A pragmatic query shape is:

- filter on `messages_fts MATCH ?`
- join `messages_fts.rowid = messages.id`
- join `messages.session_id = sessions.id`
- optionally filter `sessions.source = ?`
- order by `messages.timestamp DESC`
- limit result count

## API design

### GET /api/agents/{id}/sessions/search

Query params:

- `q`: required, trimmed search string, minimum 2 chars
- `source`: optional existing session source filter
- `limit`: optional integer with conservative maximum (for example 50)

Response shape:

```json
[
  {
    "sessionId": "20260401_002858_3e311a",
    "source": "telegram",
    "title": "...",
    "messageCount": 27,
    "startedAt": "2026-04-01T00:28:58.000Z",
    "match": {
      "messageId": 123,
      "role": "assistant",
      "timestamp": "2026-04-01T00:31:11.000Z",
      "snippet": "...error in <mark>gateway</mark> startup..."
    }
  }
]
```

Behavior:

- validate query with zod
- reject invalid `q` / `limit` with 400
- return `[]` when `state.db` does not exist
- remain read-only

## UI design

### Chat tab

Add a compact search box above the sessions panel.

States:

- idle: normal session list
- searching: loading indicator
- results: matching sessions with snippet preview
- no results: explicit empty state

Interactions:

1. operator types a query
2. UI calls the search API with debounce
3. clicking a result selects the session
4. after messages load, the matching message is visually emphasized or scrolled into view
5. clearing the query returns to the normal session list

## Why this feature fits Hermes Manager

This is not generic dashboard parity work. It improves the operator workflow for a selected managed agent:

- inspect a broken agent quickly
- find the right session to resume
- trace a known error string without opening many sessions manually

That makes it aligned with agent operations and diagnostics.
