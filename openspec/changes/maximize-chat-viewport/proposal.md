---
change_type: implementation
priority: medium
dependencies: []
references:
  - app/agents/[id]/page.tsx
  - src/components/chat-tab.tsx
  - src/components/ui/tabs.tsx
---

# Maximize Chat Viewport

**Change Type**: implementation

## Problem / Context

The agent detail Chat tab is visually compressed by the page chrome above it: breadcrumb, agent header metadata, and the tab switcher. The current Chat layout computes its own height from `window.innerHeight - rect.top - 16`, so as the tab is pushed lower in the page, the message list shrinks significantly. Users cannot view much of the conversation at once.

## Proposed Solution

Refine the agent detail and Chat tab layout so the Chat message list gets the maximum practical viewport height:

- make the agent detail page use a flex/min-height-safe structure that allows the active tab panel to grow instead of stacking extra spacing
- reduce unnecessary top spacing specifically around the Chat tab panel
- make the Chat tab use a stable viewport-aware height budget and ensure only the intended internal regions scroll
- preserve the existing mobile sessions overlay and desktop two-pane chat layout

## Acceptance Criteria

- Opening the Chat tab shows a visibly larger message list area than before on desktop and mobile
- The Chat tab no longer loses most of its height because of the tab row and page header stacking above it
- The sessions list and message list remain independently scrollable where intended
- The input area remains reachable without requiring page scrolling in normal viewport sizes
- No visual regression for non-Chat tabs

## Out of Scope

- Reworking the overall app shell header/sidebar layout
- Changing chat behavior, streaming protocol, or session APIs
- Redesigning the agent metadata header content
