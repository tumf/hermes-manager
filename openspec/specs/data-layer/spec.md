## Requirements

### Requirement: sqlite-database

SQLite database (`runtime/data/app.db`) is no longer used for agent, environment variable, or skill link data storage.

#### Scenario: no-database-at-startup

**Given**: The application starts without any `runtime/data/app.db` file
**When**: The application initializes
**Then**: The application starts successfully without creating or requiring a SQLite database

## Requirements

### Requirement: filesystem-agent-registry

Agent registration and discovery is based on the `runtime/agents/` directory structure.

#### Scenario: list-agents

**Given**: `runtime/agents/` contains directories `agent-a/` and `agent-b/`, each with a `config.yaml`
**When**: `GET /api/agents` is called
**Then**: Both agents are returned with `agentId`, `home`, `label`, `enabled`, `createdAt`, `updatedAt` derived from the filesystem

#### Scenario: get-agent

**Given**: `runtime/agents/my-agent/` exists with a `config.yaml`
**When**: Any API route resolves agent `my-agent`
**Then**: The agent's `home` is `<RUNTIME_DIR>/agents/my-agent` and `label` is `ai.hermes.gateway.my-agent`

#### Scenario: agent-not-found

**Given**: `runtime/agents/nonexistent/` does not exist
**When**: Any API route resolves agent `nonexistent`
**Then**: A 404 response is returned

#### Scenario: create-agent

**Given**: `runtime/agents/new-agent/` does not exist
**When**: `POST /api/agents` is called
**Then**: The directory `runtime/agents/new-agent/` is created with `SOUL.md`, `config.yaml`, `.env`, `logs/`, and `memories/MEMORY.md`, `memories/USER.md`
**And**: `AGENTS.md` is not scaffolded by the web app

#### Scenario: delete-agent

**Given**: `runtime/agents/old-agent/` exists
**When**: `DELETE /api/agents?id=old-agent&purge=true` is called
**Then**: The directory `runtime/agents/old-agent/` is recursively removed

### Requirement: env-meta-json-visibility

Environment variable visibility metadata is stored in `.env.meta.json` sidecar files instead of a database table.

#### Scenario: read-env-with-visibility

**Given**: `runtime/agents/my-agent/.env` contains `SECRET_KEY=abc` and `.env.meta.json` contains `{"SECRET_KEY": {"visibility": "secure"}}`
**When**: `GET /api/env?agent=my-agent` is called
**Then**: The response includes `SECRET_KEY` with value `"***"` and `visibility: "secure"`

#### Scenario: write-env-with-visibility

**Given**: `runtime/agents/my-agent/` exists
**When**: `POST /api/env` is called with `{agent: "my-agent", key: "API_KEY", value: "xyz", visibility: "secure"}`
**Then**: `runtime/agents/my-agent/.env` contains `API_KEY=xyz` and `.env.meta.json` contains `{"API_KEY": {"visibility": "secure"}}`

#### Scenario: global-env-meta

**Given**: `runtime/globals/.env` contains `GLOBAL_KEY=val` and `runtime/globals/.env.meta.json` contains `{"GLOBAL_KEY": {"visibility": "plain"}}`
**When**: `GET /api/globals` is called
**Then**: The response includes `GLOBAL_KEY` with `visibility: "plain"` and the actual value

### Requirement: symlink-based-skill-links

Skill links are managed entirely through filesystem symlinks without a database table.

#### Scenario: list-skill-links

**Given**: `runtime/agents/my-agent/skills/research/arxiv` is a symlink pointing to `~/.agents/skills/research/arxiv`
**When**: `GET /api/skills/links?agent=my-agent` is called
**Then**: The response includes the link with `sourcePath`, `targetPath`, `relativePath`, and `exists: true`

#### Scenario: create-skill-link

**Given**: `~/.agents/skills/research/arxiv/SKILL.md` exists and `runtime/agents/my-agent/skills/research/arxiv` does not exist
**When**: `POST /api/skills/links` is called with `{agent: "my-agent", relativePath: "research/arxiv"}`
**Then**: A symlink is created at `runtime/agents/my-agent/skills/research/arxiv` pointing to `~/.agents/skills/research/arxiv`

#### Scenario: delete-skill-link

**Given**: `runtime/agents/my-agent/skills/research/arxiv` is a symlink
**When**: `DELETE /api/skills/links?agent=my-agent&path=research/arxiv` is called
**Then**: The symlink is removed and empty parent directories are cleaned up

## Requirements

### Requirement: agent-enabled-flag

The `enabled` flag for agents is stored in `config.yaml` instead of a database column.

#### Scenario: read-enabled-from-config

**Given**: `runtime/agents/my-agent/config.yaml` contains `enabled: true`
**When**: `GET /api/agents` is called
**Then**: The agent `my-agent` has `enabled: true` in the response

### Requirement: filesystem-agent-registry

Agent registration and discovery is based on the `runtime/agents/` directory structure, and newly scaffolded agents include the memory files required by the app-managed editor surface.

#### Scenario: create-agent

**Given**: `runtime/agents/new-agent/` does not exist
**When**: `POST /api/agents` is called
**Then**: The directory `runtime/agents/new-agent/` is created with `SOUL.md`, `config.yaml`, `.env`, `logs/`, and `memories/MEMORY.md`, `memories/USER.md`
**And**: `AGENTS.md` is not scaffolded by the web app

### Requirement: filesystem-agent-registry

Agent registration and discovery is based on the `runtime/agents/` directory structure. Newly scaffolded agents include `memories/` subdirectory with `MEMORY.md` and `USER.md`, plus `SOUL.md` at the home root.

#### Scenario: create-agent

**Given**: `runtime/agents/new-agent/` does not exist
**When**: `POST /api/agents` is called
**Then**: The directory `runtime/agents/new-agent/` is created with `SOUL.md`, `config.yaml`, `.env`, `logs/`, and `memories/` subdirectory containing `MEMORY.md` and `USER.md`
**And**: `AGENTS.md` is not scaffolded by the web app

### Requirement: filesystem-agent-registry

Agent registration and discovery is based on the `runtime/agents/` directory structure. Newly scaffolded agents continue to include `SOUL.md`, and agents may optionally add `SOUL.src.md` to opt into partial-backed SOUL editing without changing runtime compatibility.

#### Scenario: create-agent

**Given**: `runtime/agents/new-agent/` does not exist
**When**: `POST /api/agents` is called
**Then**: the directory `runtime/agents/new-agent/` is created with `SOUL.md`, `config.yaml`, `.env`, `logs/`, and `memories/` containing `MEMORY.md` and `USER.md`
**And**: `SOUL.src.md` is not required at creation time
**And**: `AGENTS.md` is not scaffolded by the web app

#### Scenario: enable partial mode on an existing agent

**Given**: `runtime/agents/existing-agent/` contains `SOUL.md` and does not contain `SOUL.src.md`
**When**: the partial-mode enablement flow is executed for that agent
**Then**: `runtime/agents/existing-agent/SOUL.src.md` is created from the current `SOUL.md`
**And**: the agent home continues to retain `SOUL.md` as the runtime-facing assembled file

### Requirement: shared-soul-partials-store

Shared SOUL partials must be stored in the filesystem under `runtime/partials/` and managed without a database.

#### Scenario: create-partial-file

**Given**: `runtime/partials/directory-structure.md` does not exist
**When**: `POST /api/partials` is called with `{ name: "directory-structure", content: "## Directory layout" }`
**Then**: the server writes `runtime/partials/directory-structure.md`
**And**: the response identifies the created partial by name

#### Scenario: list-partials-with-usage

**Given**: `runtime/partials/secret-management.md` exists
**And**: `runtime/agents/alpha/SOUL.src.md` references `{{partial:secret-management}}`
**When**: `GET /api/partials` is called
**Then**: the response includes `secret-management`
**And**: the response includes `alpha` in the partial's `usedBy` set

#### Scenario: reject deleting an in-use partial

**Given**: `runtime/partials/secret-management.md` exists
**And**: at least one `SOUL.src.md` references `{{partial:secret-management}}`
**When**: `DELETE /api/partials?name=secret-management` is called
**Then**: the server responds 409
**And**: the partial file is not removed


### Requirement: shared-soul-partials-store

Shared SOUL partials must be stored in the filesystem under `runtime/partials/` and managed without a database. The partials API continues to report global `usedBy` relationships derived from scanning agent `SOUL.src.md` files, while per-agent insertion filtering remains a consumer-side concern.

#### Scenario: partial listing remains a global usage view

**Given**: `runtime/partials/secret-management.md` exists
**And**: `runtime/agents/alpha/SOUL.src.md` references `{{partial:secret-management}}`
**When**: `GET /api/partials` is called
**Then**: the response includes `secret-management`
**And**: the response includes `alpha` in the partial's `usedBy` set
**And**: the API does not remove `secret-management` only because another UI consumer may choose to hide already-inserted partials for its current agent context