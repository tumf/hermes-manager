## MODIFIED Requirements

### Requirement: template CRUD

Named templates can be created, read, updated, and deleted for each app-managed agent file type: `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, and `config.yaml`. `config.yaml` templates MAY include Hermes MCP configuration such as `mcp_servers`.

#### Scenario: create a config template with MCP settings

**Given** no template named `mcp-enabled` exists for file `config.yaml`
**When** `POST /api/templates` is called with `mcp_servers` in the YAML content
**Then** the template file is created successfully
**And** the MCP settings are preserved in the stored YAML
