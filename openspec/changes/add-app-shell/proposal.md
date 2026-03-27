# Add App Shell and UI Scaffolding

**Change Type**: implementation

## Summary

Initialize shadcn/ui and build the application shell and navigation for Hermes
Agents webapp. Provide a responsive sidebar with primary navigation (Agents,
Globals), shared UI components, a Globals management page, and an Agent detail
page scaffold with tabs.

## Motivation

The project needs a coherent UI framework and primary navigation to host the
features being built (skills management, logs, globals). shadcn/ui + Tailwind
are already selected, but the components and layout are not set up.

## Scope

- Initialize shadcn/ui (components.json, cn() utility, base components)
- app/layout.tsx: sidebar nav with links to / (Agents) and /globals (Globals)
- Sidebar items show icon + label with active state; mobile uses sheet sidebar
- Shared components: StatusBadge (running/stopped/unknown), ConfirmDialog
- /globals page: GlobalsManager component supports inline add/edit/delete and
  previews the regenerated globals/.env content before save
- Agent detail page scaffold: app/agents/[name]/page.tsx includes tabs: Memory,
  Config, Env, Skills, Logs

## Technical Notes

- Use shadcn/ui primitives for Sheet, Tabs, Badge, Dialog
- Keep navigation in a single Sidebar component; use usePathname to mark active
- GlobalsManager reads/writes via existing /api/globals endpoints (to be wired or
  stubbed); provide optimistic UI and zod validation for key/value
