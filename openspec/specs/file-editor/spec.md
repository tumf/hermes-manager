## Requirements

### Requirement: in-place file editing API

Provide server-side endpoints to read and update agent memory and configuration files within the agent's home directory.

- Endpoints:
  - GET /api/files?agent=...&path=MEMORY.md|USER.md|SOUL.md|config.yaml
  - PUT /api/files
- Allowed paths: restricted to MEMORY.md, USER.md, SOUL.md, config.yaml (validated via zod enum)
- YAML validation: For config.yaml, validate syntax with js-yaml; on error respond HTTP 422
- Atomic writes: Write to .tmp and then rename to target path
- Path traversal protection: Resolved path must remain within the agent home dir

#### Scenario: read file contents

Given an agent "alpha" whose home directory contains a file SOUL.md
When GET /api/files?agent=alpha&path=SOUL.md is called
Then the server responds 200 with a JSON body { content: "<file contents>" }

#### Scenario: disallow non-whitelisted paths

When GET /api/files?agent=alpha&path=AGENTS.md is called
Then the server responds 400 due to zod enum validation rejecting the path

#### Scenario: validate YAML on PUT for config.yaml

When PUT /api/files is called with body { agent: "alpha", path: "config.yaml", content: "[not: yaml" }
Then the server responds 422 with an error indicating invalid YAML

#### Scenario: atomic write

When PUT /api/files is called with a valid body for SOUL.md
Then the server writes to a .tmp file in the same directory and renames it to SOUL.md
And responds with { ok: true }
