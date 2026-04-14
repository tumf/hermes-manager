# Chat

## Purpose

agent の `api_server` へ SSE proxy で接続し、session/message の参照 API と合わせて Chat UI の外部契約を定義する。

## Requirements

### Requirement: Stream chat via api_server

The system SHALL proxy user messages to the agent's resolved localhost `api_server` endpoint and stream the upstream SSE response back to the client.

#### Scenario: Stream a valid chat request

- GIVEN agent `alpha` が存在し `apiServerStatus=connected` かつ `apiServerPort=19001` である
- WHEN `POST /api/agents/alpha/chat` に `{ "message": "hello" }` を送る
- THEN WebApp は `http://127.0.0.1:19001/v1/chat/completions` に POST する
- AND `Content-Type: text/event-stream` で upstream body を返す

#### Scenario: Invalid request body is rejected

- GIVEN `message` が空文字または不正である
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 400 を返す

#### Scenario: Unknown agent is rejected

- GIVEN agent が存在しない
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 404 を返す

### Requirement: Refuse chat when api_server is unavailable

The system SHALL return a 503 with status detail when the agent does not have a usable connected api_server port.

#### Scenario: Configured but restart required

- GIVEN agent の `apiServerStatus` が `configured-needs-restart` で `apiServerPort` がない
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 503 を返す
- AND body は `error: "api_server not available"` と `apiServerStatus` と理由文を含む

#### Scenario: Connected status without a usable port

- GIVEN `apiServerStatus=connected` だが `apiServerPort` が `null` である
- WHEN `POST /api/agents/{id}/chat` を呼び出す
- THEN 503 を返す

### Requirement: Abort upstream stream on client disconnect

The system SHALL propagate request abort to the upstream fetch.

#### Scenario: Client disconnect aborts upstream

- GIVEN Chat API が upstream SSE を処理中である
- WHEN クライアント接続が切断される
- THEN upstream fetch の abort signal が発火する

## Requirements

### Requirement: per-agent session search API

Hermes Manager MUST provide a per-agent session search API that performs full-text search against the selected agent's `state.db` message history.

#### Scenario: operator searches for a string in one managed agent

**Given** agent `alpha` has a `state.db` with indexed message history
**When** the operator calls `GET /api/agents/alpha/sessions/search?q=gateway%20error`
**Then** the system returns matching sessions for agent `alpha` only
**And** each result includes session metadata and a snippet showing the matched message context

#### Scenario: operator filters search results by source

**Given** agent `alpha` has matches in both `telegram` and `tool` sessions
**When** the operator calls `GET /api/agents/alpha/sessions/search?q=timeout&source=telegram`
**Then** only matches from `telegram` sessions are returned

#### Scenario: invalid search query is rejected

**Given** the query string is empty or shorter than the allowed minimum
**When** the operator calls `GET /api/agents/{id}/sessions/search`
**Then** the system returns 400

### Requirement: chat tab exposes per-agent session search

The Chat tab MUST expose per-agent session search as part of the managed-agent diagnostics workflow.

#### Scenario: operator opens a matching session from search results

**Given** the Chat tab shows search results for the current managed agent
**When** the operator clicks one result
**Then** the corresponding session is opened in the message pane
**And** the matching message context is revealed without requiring the operator to manually browse unrelated sessions

#### Scenario: operator clears the search query

**Given** the Chat tab is displaying session search results
**When** the operator clears the query
**Then** the UI returns to the normal session list for the current managed agent
