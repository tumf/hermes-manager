## MODIFIED Requirements

### Requirement: filesystem-agent-registry

Agent registration and discovery is based on the `runtime/agents/` directory structure, and newly scaffolded agents include the memory files required by the app-managed editor surface.

#### Scenario: create-agent

**Given**: `runtime/agents/new-agent/` does not exist
**When**: `POST /api/agents` is called
**Then**: The directory `runtime/agents/new-agent/` is created with `MEMORY.md`, `USER.md`, `SOUL.md`, `config.yaml`, `.env`, and `logs/`
**And**: `AGENTS.md` is not scaffolded by the web app
