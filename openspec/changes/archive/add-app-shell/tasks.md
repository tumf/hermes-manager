# Tasks — add-app-shell

## Implementation Tasks

- [x] Run shadcn/ui init to generate components.json and src/lib/utils.ts with
      the cn() helper function
- [x] Add base shadcn/ui components needed by the shell: Button, Badge, Sheet,
      Tabs, Dialog, Tooltip via npx shadcn-ui add
- [x] Create src/components/Sidebar.tsx with navigation links (Agents at /,
      Globals at /globals), icon + label, active highlight via usePathname, and
      Sheet-based mobile drawer triggered by a hamburger button
- [x] Update app/layout.tsx to wrap children in the Sidebar shell with a main
      content area
- [x] Create src/components/StatusBadge.tsx that accepts status: "running" |
      "stopped" | "unknown" and renders a shadcn Badge with appropriate color variant
- [x] Create src/components/ConfirmDialog.tsx that renders a shadcn AlertDialog
      with configurable title, description, and onConfirm callback for use with
      destructive actions
- [x] Create app/globals/page.tsx with a GlobalsManager component that lists
      env_vars rows where scope="global", supports inline add/edit/delete via form
      fields, and renders a live .env preview panel below the table
- [x] Create app/agents/[name]/page.tsx with a Tabs layout: Memory, Config, Env,
      Skills, Logs; each tab renders a placeholder until the respective feature
      is implemented
- [x] Validate proposal with cflx validate add-app-shell --strict
