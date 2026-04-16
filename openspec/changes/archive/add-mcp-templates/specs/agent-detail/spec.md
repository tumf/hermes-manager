## MODIFIED Requirements

### Requirement: Agent detail exposes a dedicated MCP configuration workflow

Agent detail pages SHALL provide a dedicated MCP configuration workflow for each managed agent, separate from the raw `config.yaml` editor, so operators can review, update, and reuse `mcp_servers` safely.

#### Scenario: MCP tab applies a saved template into the editor

**Given** saved MCP template `github-default` exists
**And** an operator opens agent `alpha`'s `MCP` tab
**When** the operator applies template `github-default`
**Then** the MCP editor is populated with that template's serialized `mcp_servers` fragment
**And** unrelated `config.yaml` sections are not exposed in the MCP editor

#### Scenario: MCP tab can save current fragment as template

**Given** an operator has valid MCP YAML in agent `alpha`'s `MCP` editor
**When** the operator saves it as template `github-default`
**Then** a reusable MCP template named `github-default` is created

#### Scenario: MCP tab can delete a saved template

**Given** saved MCP template `github-default` exists
**When** the operator deletes template `github-default` from the `MCP` tab workflow
**Then** that template is removed from the MCP template store
