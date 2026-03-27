# Add Agents List UI

**Change Type**: implementation

## Problem / Context

The hermes-agents webapp currently has a bare `app/page.tsx` with no meaningful
content. Users need a functional dashboard to see all agents, check their runtime
status, and perform common lifecycle operations (start/stop, create, delete, copy)
without having to use the API directly or SSH into the machine.

## Proposed Solution

Build a responsive agents management page at `app/page.tsx` using shadcn/ui
components on top of Tailwind CSS. The page will:

- Fetch and display all agents from `GET /api/agents`
- Show each agent as a card or table row with name, enabled badge, and live launchd
  status
- Provide per-agent Start/Stop toggle buttons that call the launchd control API
- Provide per-agent Delete button with a shadcn `AlertDialog` confirmation modal
- Provide per-agent Copy button with a name input popover/dialog
- Include an Add Agent form (name input + submit) at the top or in a dialog
- Be fully client-side interactive with React state / SWR / fetch

No authentication is required.

## Acceptance Criteria

1. The page renders a list/table of agents fetched from `/api/agents`.
2. Each row shows: agent name, enabled status badge (green/grey), launchd running
   indicator.
3. Each row has Start and Stop buttons that POST to the launchd control endpoint;
   the row re-fetches after the action.
4. Each row has a Delete button that opens a confirmation dialog before calling
   `DELETE /api/agents?name=...`.
5. Each row has a Copy button that opens a dialog accepting a new name and then calls
   `POST /api/agents/copy`.
6. A visible "Add Agent" form submits to `POST /api/agents`; the list refreshes on
   success.
7. The layout is responsive and renders correctly on narrow (mobile) viewports using
   shadcn/ui primitives.

## Out of Scope

- Authentication (no login required per spec)
- Editing agent env vars (separate feature)
- Launchd control API implementation (assumed to exist or be stubbed)
- Dark mode toggle
