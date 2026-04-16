---
change_type: implementation
priority: medium
dependencies: []
references:
  - docs/requirements.md
  - docs/design.md
  - openspec/specs/agent-detail/spec.md
  - openspec/specs/agent-templates/spec.md
  - openspec/specs/agent-creation/spec.md
  - app/agents/[id]/page.tsx
  - src/components/agent-mcp-tab.tsx
  - src/lib/agent-config.ts
  - src/lib/templates.ts
  - https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes
---

# Add MCP server templates

**Change Type**: implementation

## Premise / Context

- Hermes Manager already provides a dedicated MCP tab that edits only the `mcp_servers` fragment for each managed agent.
- The product’s scope is multi-agent operations and provisioning, so repeated MCP setup across many agents is an operator workflow Hermes Manager should streamline.
- Existing file templates cover `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`, but there is no fragment-level reuse mechanism for MCP-only configuration.
- Operators currently need to copy and paste MCP YAML between agents, which is error-prone and slows down fleet provisioning.
- The existing codebase already has the right patterns for this change: filesystem-backed templates, zod validation, dedicated agent tabs, and `config.yaml` fragment merge logic.

## Problem / Context

Hermes Agent MCP configuration is commonly reused across multiple managed agents, but Hermes Manager currently only supports one-off editing of the current agent’s `mcp_servers` fragment.

That creates several operator problems:

- repeated copy/paste when onboarding similar agents
- inconsistent MCP exposure across agents that should share the same policy
- no canonical reusable MCP baseline for provisioning new agents
- too much coupling between full `config.yaml` templates and a smaller MCP-only reuse need

This proposal is in-scope for Hermes Manager because it improves provisioning and fleet ergonomics for multi-agent operations. It is not aiming for full upstream dashboard parity; it adapts MCP configuration into a reusable operator workflow for a managed fleet.

Disposition relative to upstream dashboard overlap: adapt.

## Proposed Solution

Add MCP template support so operators can save, list, apply, and delete reusable `mcp_servers` fragments.

The implementation will:

- add filesystem-backed MCP template storage and CRUD APIs
- validate MCP templates as YAML mappings/objects only
- extend the agent detail MCP tab with template selection, apply, save-as-template, and delete actions
- preserve current dedicated MCP editing semantics: applying a template updates only `mcp_servers` and preserves unrelated `config.yaml` keys
- extend new agent creation so operators can optionally choose an MCP template at create time
- apply the selected MCP template during scaffolding by merging template-provided `mcp_servers` into the created agent’s `config.yaml`
- keep MCP templates separate from full-file templates so operators can reuse MCP policy independently from the rest of `config.yaml`

## Acceptance Criteria

1. Operators can create, read, list, and delete named MCP templates backed by the filesystem.
2. Saving an MCP template rejects invalid YAML and rejects non-mapping YAML values.
3. From an agent’s MCP tab, an operator can apply a saved MCP template and only the `mcp_servers` section of `config.yaml` changes.
4. From an agent’s MCP tab, an operator can save the current MCP fragment as a named MCP template.
5. From an agent’s MCP tab, an operator can delete an MCP template.
6. The Add Agent dialog lets operators select an MCP template in addition to the existing file templates.
7. When an MCP template is selected during agent creation, the created agent’s `config.yaml` contains the template-provided `mcp_servers` without disturbing the normal SOUL/memory scaffolding flow.
8. When no MCP template is selected, agent creation behavior remains backward compatible.
9. Requirements, design docs, and OpenSpec deltas describe the MCP template workflow.

## Out of Scope

- Full form-based MCP server editors
- Import/export from external registries
- Template variables or parameter substitution
- Automatic MCP connectivity probing
- Per-template versioning or inheritance
