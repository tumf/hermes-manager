# Tasks: add-agents-list-ui

## Implementation Tasks

- [x] Convert `app/page.tsx` to a client component (`"use client"`) that fetches agents with `useSWR` or `useEffect`/`fetch` from `/api/agents` (verification: `app/page.tsx` contains `"use client"` directive and fetch logic targeting `/api/agents`)
- [x] Add shadcn/ui Table (or Card grid for mobile) to render each agent row with columns: name, enabled badge, launchd status (verification: `app/page.tsx` imports shadcn Table or Card components and maps over fetched agents)
- [x] Implement enabled status badge using shadcn `Badge` component (green for enabled, grey for disabled) (verification: `app/page.tsx` renders `<Badge>` with conditional variant based on `agent.enabled`)
- [x] Add launchd status indicator: fetch or derive running state per agent, show a running/stopped indicator (verification: component fetches or computes launchd status and conditionally renders a status dot or badge)
- [x] Implement Start/Stop toggle button per agent row that calls the launchd control endpoint and refreshes the agent list on success (verification: button `onClick` performs fetch to launchd endpoint and triggers list refresh)
- [x] Implement Delete button per row that opens a shadcn `AlertDialog` for confirmation and calls `DELETE /api/agents?name={name}` on confirm (verification: `app/page.tsx` renders `<AlertDialog>` triggered by delete button, calls DELETE endpoint)
- [x] Implement Copy button per row that opens a shadcn `Dialog` with a name input and submits to `POST /api/agents/copy` (verification: `app/page.tsx` renders a copy `<Dialog>` with a controlled text input and submit handler)
- [x] Add "Add Agent" form (text input + button) above or below the list; on submit call `POST /api/agents` and refresh list on success (verification: form renders a `<Input>` and `<Button>`, POSTs to `/api/agents`, refreshes list)
- [x] Ensure responsive layout: use Tailwind responsive classes so the table/cards adapt to mobile viewports (verification: `app/page.tsx` uses responsive Tailwind classes such as `sm:`, `md:` breakpoints or shadcn responsive primitives)
- [x] Write component tests in `tests/ui/agents-page.test.tsx` covering render, add, delete, and copy interactions using mock fetch responses (verification: `npm test` passes with tests in `tests/ui/agents-page.test.tsx`)

## Future Work

- Dark mode support
- Agent env var editor panel
- Launchd log streaming per agent
