# Design: MCP server templates

## Summary

This change adds reusable templates for the `mcp_servers` fragment so operators can apply the same MCP policy to many managed agents and optionally use that template at agent creation time.

## Why this belongs in Hermes Manager

- Improves multi-agent provisioning by removing repeated MCP copy/paste work.
- Improves fleet consistency because a named MCP baseline can be reused across agents.
- Goes beyond a raw editor while staying focused on managed-agent operations rather than full single-agent dashboard parity.

Disposition relative to upstream overlap: adapt.

## Data model

Add a filesystem-backed MCP template store separate from full-file templates.

Proposed storage:

- `runtime/mcp-templates/{name}.yaml`

Template name rules:

- same safe naming rule as other templates: `[a-zA-Z0-9_-]+`
- content must parse as YAML mapping/object

This separation keeps fragment-level MCP reuse independent from `runtime/templates/{templateName}/config.yaml`, which remains the mechanism for full config scaffolding.

## API design

Introduce dedicated MCP template endpoints rather than overloading `/api/templates`.

- `GET /api/mcp-templates`
  - returns `[{ name }]`
- `GET /api/mcp-templates?name=...`
  - returns `{ name, content }`
- `POST /api/mcp-templates`
  - body: `{ name, content }`
  - validates name and MCP YAML object shape
  - creates new template, 409 on duplicate
- `PUT /api/mcp-templates`
  - body: `{ name, content }`
  - validates name and MCP YAML object shape
  - updates existing template, 404 if missing
- `DELETE /api/mcp-templates?name=...`
  - deletes template, 404 if missing

Validation rules:

- query/body validated with zod
- YAML parse errors return 422
- non-object YAML returns 422
- filesystem path resolution uses runtime root + traversal guard

## Agent MCP tab flow

Enhance the existing MCP tab with a template workflow:

- load template list on tab open
- choose template from a select control
- `Apply Template` fetches the selected template content and fills the MCP editor
- `Save as Template` saves the current editor content under a chosen template name
- `Delete Template` deletes the selected template
- saving the editor still writes only `mcp_servers` into `config.yaml`

Important behavior:

- applying a template changes the MCP editor value only; persistence to `config.yaml` still happens through the existing save flow
- this preserves the current explicit-save interaction and avoids hidden config writes

## Agent creation flow

Extend the Add Agent dialog and create-agent API payload with an optional MCP template selection.

Proposed request shape extension:

```json
{
  "templates": {
    "memoryMd": "default",
    "userMd": "default",
    "soulMd": "default",
    "configYaml": "default"
  },
  "mcpTemplate": "github-default"
}
```

Creation behavior:

1. resolve existing file templates as today
2. scaffold SOUL/memory/config files
3. if `mcpTemplate` is present, load the template content
4. validate it as an MCP object
5. merge it into the created agent `config.yaml` as `mcp_servers`
6. preserve all other scaffolded config keys

If `mcpTemplate` is absent, creation behavior remains unchanged.

## Testing strategy

- helper tests for MCP template storage and validation
- route tests for CRUD API and validation failures
- UI tests for MCP tab template apply/save/delete actions
- Add Agent dialog tests for MCP template submission
- agent creation tests for merged `mcp_servers` behavior
