## MODIFIED Requirements

### Requirement: add agent dialog with template selection

The `Add Agent` dialog lets the user select templates for all app-managed files scaffolded at creation time and an optional MCP template for `mcp_servers` reuse.

#### Scenario: open add agent dialog with MCP template selector

**Given** the user is on the Agents list page
**When** the user clicks `Add Agent`
**Then** a dialog appears with four dropdown selects for `memories/MEMORY.md`, `memories/USER.md`, `SOUL.md`, and `config.yaml`
**And** the dialog also exposes an optional MCP template selector for reusable `mcp_servers` fragments

### Requirement: MCP template CRUD

Named MCP templates can be created, read, updated, listed, and deleted as reusable `mcp_servers` fragments.

#### Scenario: create an MCP template

**Given** no MCP template named `github-default` exists
**When** `POST /api/mcp-templates` is called with `{ "name": "github-default", "content": "github:\n  command: npx\n" }`
**Then** the template is created and returned

#### Scenario: reject invalid MCP template YAML

**Given** no MCP template named `broken` exists
**When** `POST /api/mcp-templates` is called with invalid YAML content
**Then** the API returns 422
**And** no template is stored

#### Scenario: reject non-object MCP template YAML

**Given** no MCP template named `scalar-template` exists
**When** `POST /api/mcp-templates` is called with scalar or array YAML content
**Then** the API returns 422
**And** the error indicates an object/mapping is required

#### Scenario: list saved MCP templates

**Given** MCP templates `github-default` and `filesystem-default` exist
**When** `GET /api/mcp-templates` is called
**Then** both template names are returned

#### Scenario: delete an MCP template

**Given** MCP template `github-default` exists
**When** `DELETE /api/mcp-templates?name=github-default` is called
**Then** the template is deleted
