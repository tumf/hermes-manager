# Add secure/plain visibility for environment variables

## Problem / Context

Operators can manage per-agent and global environment variables from the Web UI, but the current product has no persisted attribute that distinguishes secrets from non-sensitive values.
As a result, sensitive values are either always masked in one API surface or always shown in another, and the UI cannot consistently decide which values should be hidden.
The repository also already treats masking as a display concern for agent-local `.env` reads, while runtime `.env` files must continue to contain real values for Hermes execution.

## Proposed Solution

Add a persisted `visibility` attribute to environment variable records with two allowed values: `secure` and `plain`.
Apply this attribute to both global-scoped variables stored in `env_vars` and agent-scoped variables exposed through the environment management APIs and UI.
Default existing and newly-created variables to `plain` unless explicitly marked otherwise, so the change remains backward-compatible for current operators.
Mask `secure` values in list/read APIs and management UIs, while continuing to write the real values into generated `.env` files and resolved runtime views where execution requires the true value.

## Acceptance Criteria

- Global and agent environment variable records support a persisted `visibility` attribute with values `plain` or `secure`.
- Management APIs return `visibility` for each variable and mask displayed values only when `visibility=secure`.
- The `/globals` page and agent Env UI allow operators to select `plain` or `secure` during create and edit flows.
- Existing variables behave as `plain` after migration or fallback handling, avoiding sudden blanket masking.
- Generated `.env` files continue to contain the real values regardless of visibility.
- API and UI tests cover secure/plain display behavior and persistence.

## Out of Scope

- Encrypting values at rest in SQLite or `.env` files.
- Adding per-user authorization to reveal secure values.
- Changing Hermes runtime loading semantics for `.env` files.
