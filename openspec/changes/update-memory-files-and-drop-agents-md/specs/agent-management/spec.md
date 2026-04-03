## MODIFIED Requirements

### Requirement: agent creation

Agent creation no longer scaffolds `AGENTS.md`. The web app scaffolds the app-managed memory and config files needed for a newly created agent home.

#### Scenario: agent directory scaffolding uses id

**Given**: A new agent is created with id `x9k2m7p`
**When**: The filesystem is scaffolded
**Then**: The directory `runtime/agents/x9k2m7p/` is created containing `MEMORY.md`, `USER.md`, `SOUL.md`, `config.yaml`, `.env`, and `logs/`
**And**: `AGENTS.md` is not created by the scaffold step
