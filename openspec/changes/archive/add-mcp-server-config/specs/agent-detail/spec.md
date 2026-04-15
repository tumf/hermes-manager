## ADDED Requirements

### Requirement: Agent detail exposes a dedicated MCP configuration workflow

Agent detail pages SHALL provide a dedicated MCP configuration workflow for each managed agent, separate from the raw `config.yaml` editor, so operators can review and update `mcp_servers` safely.

#### Scenario: MCP tab is visible in agent detail

**Given** an operator opens an agent detail page
**When** the detail tabs render
**Then** an `MCP` tab is shown alongside the existing management tabs

#### Scenario: MCP tab loads only mcp_servers fragment

**Given** agent `alpha` has `mcp_servers` configured in `config.yaml`
**When** the operator opens the `MCP` tab
**Then** the editor loads only the serialized `mcp_servers` fragment
**And** it does not expose unrelated `config.yaml` sections in that editor

#### Scenario: MCP tab provides upstream docs link

**Given** the operator opens the `MCP` tab
**When** the help text is displayed
**Then** the UI includes a direct link to the Hermes MCP usage guide
**And** the link opens the upstream documentation URL
