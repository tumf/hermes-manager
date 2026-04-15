# Design: MCP server configuration workflow

## Overview

Hermes Manager should expose MCP configuration as a managed per-agent workflow while keeping `config.yaml` as the source of truth. The design intentionally edits only the `mcp_servers` subtree so operators can manage MCP safely without taking ownership of the entire upstream config surface.

## Why this belongs in Hermes Manager

This is a fleet-operations feature, not dashboard parity work:

- operators frequently need to compare and update MCP exposure across many agents
- MCP servers can expose dangerous tool surfaces, so per-agent reviewable configuration matters operationally
- editing the full YAML file for every small MCP change is error-prone when provisioning or maintaining multiple managed agents

## Data model

No new persistent store is introduced.

- Canonical storage remains `runtime/agents/{agentId}/config.yaml`
- Hermes Manager derives an editable MCP fragment from `config.yaml.mcp_servers`
- The dedicated API writes the merged result back to `config.yaml`

## API design

Add `GET/PUT /api/agents/{id}/mcp`.

Response shape:

```json
{
  "content": "project_fs:\n  command: npx\n  args:\n    - -y\n    - @modelcontextprotocol/server-filesystem\n    - /workspace/project\n",
  "docsUrl": "https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes"
}
```

PUT body:

```json
{
  "content": "github:\n  command: npx\n  args: ['-y', '@modelcontextprotocol/server-github']\n"
}
```

Behavior:

- validate `id` through existing agent lookup/path-guard behavior
- parse current `config.yaml` as an object
- parse incoming `content` as YAML object representing only `mcp_servers`
- reject non-object YAML values
- on non-empty content, set `config.mcp_servers = parsedFragment`
- on empty/whitespace-only content, remove `config.mcp_servers`
- write the complete config back atomically
- preserve unrelated config keys and their values

## Validation rules

The dedicated MCP editor should validate only what Hermes Manager can check safely and generically:

- the fragment must be valid YAML
- the fragment root must be a mapping/object when non-empty
- server entries should remain YAML-native data and are not schema-locked to avoid drifting behind upstream Hermes MCP support

This intentionally avoids brittle over-validation of every possible upstream server field.

## UI design

Agent detail page gains a dedicated `MCP` tab next to `Config`.

The tab contains:

- short operator-facing explanation
- upstream Hermes MCP docs link
- YAML editor for the `mcp_servers` fragment only
- save button and unsaved-state handling matching existing file editors

Why a separate tab instead of overloading `config.yaml`:

- isolates a high-risk, operator-relevant config area
- keeps the existing raw config editor available for advanced cases
- aligns with the product goal of making repeated multi-agent workflows easier without claiming complete upstream config coverage

## Merge strategy

Read path:

1. parse `config.yaml`
2. read `config.mcp_servers`
3. if absent, return empty content
4. if present, serialize only that subtree as YAML for editing

Write path:

1. parse existing full config
2. parse editor fragment
3. replace or delete `mcp_servers`
4. serialize full config back to YAML
5. atomically write `config.yaml`

## Risks and mitigations

Risk: formatting of unrelated `config.yaml` sections may normalize on save.
Mitigation: limit writes to the dedicated MCP workflow and keep semantic preservation of unrelated keys as the primary guarantee.

Risk: upstream Hermes may add new MCP fields.
Mitigation: avoid strict schema-locking and accept arbitrary YAML mappings under each server.

Risk: users may expect saving MCP config to hot-reload the running gateway.
Mitigation: document that gateway restart or upstream reload command may still be required; the scope here is configuration management.
