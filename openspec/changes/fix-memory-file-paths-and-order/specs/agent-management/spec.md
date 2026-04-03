## MODIFIED Requirements

### Requirement: agent creation

Agent creation no longer scaffolds `AGENTS.md`. The web app scaffolds `SOUL.md` at the home root and `MEMORY.md` / `USER.md` under the `memories/` subdirectory.

#### Scenario: agent directory scaffolding uses id

**Given**: A new agent is created with id `x9k2m7p`
**When**: The filesystem is scaffolded
**Then**: The directory `runtime/agents/x9k2m7p/` is created containing `SOUL.md`, `config.yaml`, `.env`, `logs/`, and `memories/MEMORY.md`, `memories/USER.md`
**And**: `AGENTS.md` is not created by the scaffold step
