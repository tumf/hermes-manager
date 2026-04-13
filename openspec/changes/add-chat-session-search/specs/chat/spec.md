## ADDED Requirements

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
