# Add In-Place File Editor API

**Change Type**: implementation

## Problem / Context

Each Hermes agent has a home directory containing memory and configuration files
(`AGENTS.md`, `SOUL.md`, `config.yaml`). Operators currently must SSH into the host
or use a terminal to edit these files. There is no in-browser editing capability in the
hermes-agents webapp, making quick adjustments slow and inconvenient.

## Proposed Solution

Introduce a `GET /api/files` endpoint to read file contents and a `PUT /api/files`
endpoint to write them back, both scoped to a specific agent by name.

Allowed file paths are restricted to a zod enum (`AGENTS.md`, `SOUL.md`, `config.yaml`)
to prevent arbitrary file access. An additional path-traversal guard resolves the target
path and verifies it remains within the agent's home directory before any I/O.

For `config.yaml`, the `PUT` handler validates YAML syntax using `js-yaml` before writing,
returning HTTP 422 on parse errors. Writes are atomic: content is first written to a `.tmp`
sibling file, then renamed into place to avoid partial writes.

The agent record is resolved from SQLite to obtain the canonical `home` path.

## Acceptance Criteria

1. `GET /api/files?agent=<name>&path=AGENTS.md` returns `{content: string}` with file contents.
2. `GET /api/files?agent=<name>&path=<disallowed>` returns HTTP 400.
3. `PUT /api/files` with valid body writes the file atomically and returns `{ok: true}`.
4. `PUT /api/files` with `path: "config.yaml"` and invalid YAML returns HTTP 422.
5. A path that resolves outside the agent home dir is rejected with HTTP 400.
6. If the agent is not found in the DB, the endpoint returns HTTP 404.

## Out of Scope

- Rich text / diff-based editing UI — a separate frontend change.
- Syntax highlighting or schema validation beyond basic YAML well-formedness.
- Authentication / authorization — intranet-only application.
