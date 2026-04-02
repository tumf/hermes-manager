---
change_type: implementation
priority: medium
dependencies: []
references:
  - tests/components/chat-messages.test.tsx
  - tests/components/chat-input.test.tsx
  - tests/components/session-list.test.tsx
  - tests/ui/agent-detail-page.test.tsx
  - tests/ui/agent-env-tab.test.tsx
  - tests/ui/agent-detail-env-tab.test.tsx
---

# Deduplicate UI Test Helpers

**Change Type**: implementation

## Problem / Context

The UI test suite contains repeated fetch-routing setup and repeated render scaffolding across multiple files. The clearest clusters are the `ChatTab` tests, the `AgentEnvTab` tests, and `tests/ui/agent-detail-page.test.tsx`, where endpoint stubs are manually re-declared with overlapping branches.

This duplication increases maintenance cost, makes behavior changes harder to apply consistently, and obscures the intent of each test because a large portion of each file is spent rebuilding similar fixture routers.

## Proposed Solution

Introduce shared UI test helpers for repeated mock setup while preserving behavior-focused assertions:

1. Extract reusable fetch-router helpers for common endpoint groups such as ChatTab fixtures and Env tab fixtures.
2. Consolidate repeated render/setup patterns so tests describe only the state variations that matter.
3. Keep product assertions at the current feature boundaries while reducing per-file boilerplate.

## Acceptance Criteria

- `ChatTab` UI tests no longer maintain largely duplicated inline fetch routers for the same endpoint family.
- `AgentEnvTab`-related tests share reusable fixture setup where they currently duplicate the same endpoint and row state definitions.
- `agent-detail-page` tests do not contain duplicated fetch route branches for the same endpoint.
- Refactoring preserves current test coverage intent and does not reduce the behavior asserted by the affected tests.
- Shared helpers remain scoped to tests and do not introduce production runtime dependencies.

## Out of Scope

- Rewriting unrelated tests that do not share meaningful setup
- Reclassifying tests between unit/integration/E2E
- Product behavior changes in the underlying UI components
