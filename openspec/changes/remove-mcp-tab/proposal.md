---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - app/agents/[id]/page.tsx
  - src/components/agent-file-editor.tsx
  - app/api/agents/[id]/mcp/route.ts
  - app/api/mcp-templates/route.ts
---

# Remove MCP tab

**Change Type**: implementation

## Problem / Context

Hermes Agent itself stores MCP server configuration inside `config.yaml` under `mcp_servers`. Hermes Manager currently exposes a dedicated MCP tab and dedicated MCP/template APIs in addition to the raw `config.yaml` editor.

That split no longer matches the desired operator workflow:

- operators should edit MCP server settings directly in `config.yaml`
- keeping a separate MCP tab creates a second configuration path for the same underlying data
- dedicated MCP fragment/template APIs increase surface area without improving multi-agent operations
- the Config tab already provides the canonical file-level editing flow for agent runtime configuration

Disposition relative to upstream dashboard overlap: adapt.

## Proposed Solution

Remove the dedicated MCP tab and MCP-specific editing/template flows, and treat MCP server configuration as part of the normal `config.yaml` editing workflow.

The implementation will:

- remove the MCP tab from the agent detail page
- remove the dedicated MCP editor component and its UI translations
- remove MCP fragment and MCP template API routes plus their tests
- keep `config.yaml` editing as the only UI path for MCP configuration
- update requirements/design docs and spec deltas so MCP configuration is described as `config.yaml` editing rather than a separate tab/API workflow

## Acceptance Criteria

- Agent detail no longer shows an MCP tab.
- Operators edit MCP server configuration only through the Config tab’s `config.yaml` editor.
- Dedicated MCP API routes and MCP template API routes are removed from the product surface.
- Documentation and OpenSpec no longer describe a separate MCP tab or MCP fragment/template API.
- Existing `config.yaml` editing and agent creation flows continue to work.

## Out of Scope

- Adding new structured MCP forms inside Config.
- Migrating existing config content; `mcp_servers` remains in `config.yaml` as-is.
- Any change to Hermes upstream MCP semantics.
