## MODIFIED Requirements

### Requirement: Runtime-generated data MUST be stored under a unified runtime root

The system MUST store generated operational data under `{PROJECT_ROOT}/runtime/` instead of scattering it across multiple top-level directories. Shared SOUL partials must also live under this runtime root.

#### Scenario: agent scaffolding uses runtime/agents

**Given** the application is configured with the default runtime root
**When** a client creates a new agent
**Then** the server creates `{PROJECT_ROOT}/runtime/agents/<agentId>`
**And** writes `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml`, `.env`, and `logs/` inside that directory

#### Scenario: shared soul partials use runtime/partials

**Given** the application is configured with the default runtime root
**When** a client creates or updates a shared SOUL partial
**Then** the file is stored under `{PROJECT_ROOT}/runtime/partials/<name>.md`
**And** no separate database or external store is required for partial contents
