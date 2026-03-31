---
change_type: implementation
priority: low
dependencies: []
references:
  - app/agents/[id]/page.tsx
---

# Remove Log Tab Height Limit

**Change Type**: implementation

## Problem / Context

Agent detail page's Logs tab restricts the log viewer `<pre>` element to `max-h-96` (384px). When logs are long, users must scroll within a small box, making it hard to read and search through log output. The user wants the log content to expand fully without an artificial height cap.

## Proposed Solution

Remove the `max-h-96` class from the log `<pre>` element in `app/agents/[id]/page.tsx:774`. The page itself is already scrollable via the app shell's `overflow-y-auto` on `<main>`, so the log content will naturally flow and the user can scroll the full page to navigate.

## Acceptance Criteria

- The log `<pre>` element has no `max-height` constraint
- Long logs render fully without an inner scrollbar on the log element
- The page remains scrollable via the outer layout
- No visual regression on short logs or empty state

## Out of Scope

- Log pagination or virtual scrolling
- Log search/filter functionality
