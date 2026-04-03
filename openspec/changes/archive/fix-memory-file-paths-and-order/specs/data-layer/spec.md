## MODIFIED Requirements

### Requirement: filesystem-agent-registry

Agent registration and discovery is based on the `runtime/agents/` directory structure. Newly scaffolded agents include `memories/` subdirectory with `MEMORY.md` and `USER.md`, plus `SOUL.md` at the home root.

#### Scenario: create-agent

**Given**: `runtime/agents/new-agent/` does not exist
**When**: `POST /api/agents` is called
**Then**: The directory `runtime/agents/new-agent/` is created with `SOUL.md`, `config.yaml`, `.env`, `logs/`, and `memories/` subdirectory containing `MEMORY.md` and `USER.md`
**And**: `AGENTS.md` is not scaffolded by the web app
