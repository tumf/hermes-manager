## MODIFIED Requirements

### Requirement: in-place file editing API

Provide server-side endpoints to read and update agent memory and configuration files within the agent's home directory. For SOUL editing, the API must support both legacy direct-edit mode and partial-backed source mode without requiring Hermes runtime changes.

- Endpoints:
  - GET /api/files?agent=...&path=SOUL.md|SOUL.src.md|memories/MEMORY.md|memories/USER.md|config.yaml
  - PUT /api/files
- Allowed paths: restricted to `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml`
- YAML validation: For `config.yaml`, validate syntax with js-yaml; on error respond HTTP 422
- Atomic writes: Write to `.tmp` and then rename to the target path
- Path traversal protection: Resolved path must remain within the agent home dir
- `PUT path=SOUL.md` remains available only for agents that do not have `SOUL.src.md`
- `PUT path=SOUL.src.md` must validate partial references and regenerate `SOUL.md`; on failure respond HTTP 422 and do not update either file

#### Scenario: read SOUL source when partial mode is enabled

**Given**: agent `alpha` has `SOUL.src.md` and `SOUL.md`
**When**: `GET /api/files?agent=alpha&path=SOUL.src.md` is called
**Then**: the server responds 200 with `{ content: "<source contents>" }`

#### Scenario: preserve direct SOUL editing for legacy agents

**Given**: agent `alpha` has `SOUL.md` and does not have `SOUL.src.md`
**When**: `PUT /api/files` is called with `{ agent: "alpha", path: "SOUL.md", content: "# updated" }`
**Then**: the server updates `SOUL.md` atomically and responds with `{ ok: true }`

#### Scenario: rebuild assembled SOUL on source save

**Given**: agent `alpha` has `SOUL.src.md` containing `{{partial:shared-rules}}`
**And**: `runtime/partials/shared-rules.md` exists
**When**: `PUT /api/files` is called with `{ agent: "alpha", path: "SOUL.src.md", content: "# Soul\n\n{{partial:shared-rules}}" }`
**Then**: the server updates `SOUL.src.md`
**And**: regenerates `SOUL.md` with the referenced partial expanded
**And**: responds with `{ ok: true }`

#### Scenario: reject unknown partial references on source save

**Given**: agent `alpha` has `SOUL.src.md`
**When**: `PUT /api/files` is called with `{ agent: "alpha", path: "SOUL.src.md", content: "{{partial:missing-partial}}" }`
**Then**: the server responds 422
**And**: neither `SOUL.src.md` nor `SOUL.md` is modified
