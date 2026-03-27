# Design: secure/plain visibility for environment variables

## Summary

This change introduces a product-level `visibility` attribute for managed environment variables so the UI and management APIs can consistently mask secrets without changing runtime `.env` behavior.

## Premise / Context

- The repo already treats masking as a display behavior for `GET /api/env`, while `.env` files still store executable values.
- Global variables are modeled in `env_vars` and regenerated into `runtime/globals/.env` for launchd/Hermes execution.
- The request is specifically to add `secure/plain` semantics to variables configured via Global Variables and related env management screens.
- Repo instructions require docs to be updated before or alongside behavior changes, and API inputs must be zod-validated.

## Data Model

Add `visibility` to environment variable records.

### Global variables

`env_vars` gains a `visibility` text column constrained in application logic to:

- `plain`
- `secure`

Default behavior:

- Existing rows are interpreted as `plain`.
- New writes default to `plain` when omitted.

### Agent variables

Agent-local variables currently live in per-agent `.env` files. To support persisted visibility consistently, implementation may either:

1. store agent env metadata in `env_vars` for `scope=<agentName>` and continue generating `.env` files from that state, or
2. introduce an adjacent persisted metadata structure for agent env visibility while keeping `.env` as the source of executable values.

The implementation must satisfy the externally visible API behavior in the specs:

- persisted `visibility`
- secure values masked in management reads
- real values preserved in runtime/resolved execution views

## API Behavior

### Management reads

- `/api/globals` returns `visibility` per row.
- `/api/env?agent=...` returns `visibility` per row.
- If `visibility=secure`, management reads return `value: "***"` and `masked: true` unless an explicit future reveal workflow is introduced.
- If `visibility=plain`, management reads return the plaintext value and `masked: false`.

### Writes

- Globals and agent env upsert APIs accept optional `visibility`.
- Omitted `visibility` defaults to `plain`.
- Updates may change both `value` and `visibility`.

### Resolved runtime view

- `/api/env/resolved?agent=...` remains an execution-oriented merged view.
- It continues to return real values with source annotations so operators can verify the effective runtime configuration.
- `visibility` may be included as metadata if helpful, but masking does not apply to this endpoint because it is meant to reflect actual runtime values.

## UI Behavior

- `/globals` and the agent Env tab add a visibility selector with `plain` and `secure` options.
- Secure rows display masked values in the table/list views.
- Plain rows display plaintext values.
- Edit flows preserve the stored visibility and allow changing it.

## Runtime File Generation

Visibility does not alter generated dotenv content.

- `runtime/globals/.env` continues to contain real values.
- Agent `.env` files continue to contain real values.
- Masking is strictly a management display concern.

## Migration / Compatibility

To avoid surprising operators, the proposal assumes backward-compatible defaults:

- existing variables behave as `plain`
- newly created variables behave as `plain` unless the user selects `secure`

This preserves current visibility for existing setups while enabling explicit masking for new sensitive entries.
