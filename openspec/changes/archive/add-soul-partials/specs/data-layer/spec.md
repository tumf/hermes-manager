## MODIFIED Requirements

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
