## Requirements

### Requirement: agent creation

Agent creation no longer requires a user-supplied name. The system auto-generates a unique 7-character ID.

#### Scenario: create agent without name input

**Given**: The user clicks "Add Agent" in the UI
**When**: The request is sent to `POST /api/agents` with no body
**Then**: A new agent is created with a system-generated `id` matching `[0-9a-z]{7}`, the response contains the generated `id`, and the agent's `home` is `runtime/agents/{id}/`

#### Scenario: auto-generated id uniqueness

**Given**: An agent with id "abc1234" already exists
**When**: `generateAgentId()` produces "abc1234" on first attempt
**Then**: The system retries and produces a different unique id

#### Scenario: agent directory scaffolding uses id

**Given**: A new agent is created with id "x9k2m7p"
**When**: The filesystem is scaffolded
**Then**: The directory `runtime/agents/x9k2m7p/` is created containing `MEMORY.md`, `USER.md`, `SOUL.md`, `config.yaml`, `.env`, and `logs/`
**And**: `AGENTS.md` is not created by the scaffold step

### Requirement: agent copy without destination name

Agent copy no longer requires a user-supplied destination name.

#### Scenario: copy agent with auto-generated id

**Given**: An agent with id "abc1234" exists
**When**: `POST /api/agents/copy` is called with `{ "from": "abc1234" }`
**Then**: A new agent is created with a system-generated id, and all files from the source agent are copied to the new agent's home directory

### Requirement: agent identification across system

All subsystems use agent id consistently.

#### Scenario: launchd label uses agent id

**Given**: An agent with id "x9k2m7p" exists
**When**: launchd service is installed
**Then**: The launchd label is `ai.hermes.gateway.x9k2m7p`

#### Scenario: env_vars scope uses agent id

**Given**: An agent with id "x9k2m7p" exists
**When**: An environment variable is added for this agent
**Then**: The `env_vars.scope` is set to "x9k2m7p"

#### Scenario: skill_links agent uses agent id

**Given**: An agent with id "x9k2m7p" exists
**When**: A skill link is created for this agent
**Then**: The `skill_links.agent` is set to "x9k2m7p"

#### Scenario: legacy agents with old name format

**Given**: An existing agent has name "my-old-agent" (created before this change)
**When**: The system queries or operates on this agent
**Then**: The agent is found and operates normally using "my-old-agent" as its id

### Requirement: agent deletion by id

#### Scenario: delete agent by id

**Given**: An agent with id "x9k2m7p" exists
**When**: `DELETE /api/agents?id=x9k2m7p` is called
**Then**: The agent is removed from DB, its home directory is deleted, and its launchd service is uninstalled

## Requirements

### Requirement: user-supplied agent name

The user no longer supplies a name when creating or copying an agent. The system generates the identifier automatically.

### Requirement: agent creation

Agent creation no longer scaffolds `AGENTS.md`. The web app scaffolds the app-managed memory and config files needed for a newly created agent home.

#### Scenario: agent directory scaffolding uses id

**Given**: A new agent is created with id `x9k2m7p`
**When**: The filesystem is scaffolded
**Then**: The directory `runtime/agents/x9k2m7p/` is created containing `MEMORY.md`, `USER.md`, `SOUL.md`, `config.yaml`, `.env`, and `logs/`
**And**: `AGENTS.md` is not created by the scaffold step
