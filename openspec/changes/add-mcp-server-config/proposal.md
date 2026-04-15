---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - app/agents/[id]/page.tsx
  - app/api/files/route.ts
  - https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes
---

# Add MCP server configuration workflow

**Change Type**: implementation

## Problem / Context

Hermes Agent supports MCP server integration through `config.yaml`, but Hermes Manager currently only exposes raw `config.yaml` editing. That is technically sufficient, but it is not a good operator workflow when managing multiple agents with different MCP policies.

This proposal is justified as Hermes Manager scope because:

- multi-agent operators need to see and update MCP exposure per agent without manually editing the entire config file
- MCP tool exposure has safety implications (`tools.include`, `tools.exclude`, `prompts`, `resources`, `enabled`) that should be easier to review per managed agent
- this is not aiming for full upstream dashboard parity; it adapts MCP config into a fleet-operations workflow centered on per-agent runtime management
- linking out to upstream docs alone is insufficient because operators still need a safe, repeatable place in Hermes Manager to edit and verify each agent’s MCP config

Disposition relative to upstream dashboard overlap: adapt.

## Proposed Solution

Add a dedicated MCP configuration editor in Hermes Manager that manages only the `mcp_servers` section of an agent’s `config.yaml` while preserving the rest of the file.

The implementation will:

- add a route for reading and updating agent MCP configuration as YAML
- validate the MCP YAML fragment before persisting it back into `config.yaml`
- merge the edited `mcp_servers` section into the full config and remove the section when the MCP fragment is empty
- expose the editor in the agent detail Config area with a docs link and guidance aligned with Hermes MCP documentation
- update requirements/design docs so MCP configuration becomes an explicit supported operator workflow

## Acceptance Criteria

- An operator can open an agent detail page and edit that agent’s `mcp_servers` configuration without manually rewriting unrelated `config.yaml` sections.
- Saving invalid MCP YAML is rejected with a validation error and does not modify `config.yaml`.
- Saving valid MCP YAML updates only the `mcp_servers` section in `config.yaml`, preserving unrelated config keys.
- Clearing the MCP editor removes `mcp_servers` from `config.yaml`.
- The UI presents a direct link to the upstream Hermes MCP usage guide.
- Requirements, design docs, and OpenSpec deltas describe the new workflow.

## Out of Scope

- Full form-based modeling of every possible MCP server field
- Runtime probing of MCP server connectivity from Hermes Manager
- Automatic package installation for `npx`/`uvx` MCP servers
- Policy linting beyond YAML/object-shape validation
