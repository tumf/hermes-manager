## Requirements

### Requirement: Runtime-generated data MUST be stored under a unified runtime root

The system MUST store generated operational data under `{PROJECT_ROOT}/runtime/` instead of scattering it across multiple top-level directories.

#### Scenario: agent scaffolding uses runtime/agents

**Given** the application is configured with the default runtime root
**When** a client creates a new agent named `alpha`
**Then** the server creates `{PROJECT_ROOT}/runtime/agents/alpha`
**And** writes `AGENTS.md`, `SOUL.md`, `config.yaml`, `.env`, and `logs/` inside that directory
**And** stores that runtime path in the agent record

#### Scenario: globals env file uses runtime/globals

**Given** one or more global variables exist in the database
**When** the globals env file is regenerated
**Then** the file is written to `{PROJECT_ROOT}/runtime/globals/.env`

#### Scenario: sqlite database uses runtime/data

**Given** the application starts with the default runtime root
**When** the database client initializes
**Then** it uses `{PROJECT_ROOT}/runtime/data/app.db` as the SQLite database path

### Requirement: Existing installations MUST have a safe migration path to runtime/

The system MUST provide a documented and repeatable migration path from legacy top-level generated directories to the unified runtime root.

#### Scenario: migrate legacy agent homes

**Given** an installation contains legacy directories under `{PROJECT_ROOT}/agents/`, `{PROJECT_ROOT}/globals/`, and `{PROJECT_ROOT}/data/`
**When** the migration procedure is executed
**Then** those generated directories are moved or copied into `{PROJECT_ROOT}/runtime/`
**And** each existing agent record has its `home` updated to the new runtime path
**And** the procedure can be re-run without corrupting already migrated data

#### Scenario: migrate launchd references after runtime relocation

**Given** an agent was previously installed with launchd using legacy filesystem paths
**When** the migration procedure or reinstall flow runs
**Then** the resulting launchd plist references the agent env file and logs under `{PROJECT_ROOT}/runtime/agents/<name>/`
**And** the shared globals env file under `{PROJECT_ROOT}/runtime/globals/.env`

## Requirements

### Requirement: Agent lifecycle filesystem layout

Agent lifecycle operations MUST use the unified runtime root for per-agent home directories.

#### Scenario: delete removes runtime agent home

**Given** an existing agent `charlie` with home `{PROJECT_ROOT}/runtime/agents/charlie`
**When** a client deletes that agent with purge enabled
**Then** the server removes the database row
**And** recursively deletes `{PROJECT_ROOT}/runtime/agents/charlie`

#### Scenario: copy duplicates runtime agent home

**Given** an existing agent `delta` with home `{PROJECT_ROOT}/runtime/agents/delta`
**When** a client posts to copy that agent to `echo`
**Then** the server deep-copies `{PROJECT_ROOT}/runtime/agents/delta` to `{PROJECT_ROOT}/runtime/agents/echo`
**And** inserts a new agent row whose `home` is `{PROJECT_ROOT}/runtime/agents/echo`
