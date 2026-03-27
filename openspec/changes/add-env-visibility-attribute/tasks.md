## Implementation Tasks

- [x] 1. Extend environment variable persistence to store `visibility` for global and agent-scoped variables, with backward-compatible default handling for existing rows and reads (verification: `db/schema.ts`, related migration files, and any env persistence helpers include `visibility`; existing rows resolve as `plain`).
- [x] 2. Update globals validation and API behavior so `GET /api/globals` returns `visibility`, `POST /api/globals` accepts and persists it, and secure globals are masked in management responses while `runtime/globals/.env` still contains real values (verification: `app/api/globals/route.ts`, `src/lib/validators/globals.ts`, `src/lib/globals-env.ts`, `tests/api/globals.test.ts`).
- [x] 3. Update agent env APIs so masked reads depend on `visibility`, writes persist `visibility`, and resolved runtime views continue to expose executable real values with source annotations (verification: `app/api/env/route.ts`, `app/api/env/resolved/route.ts`, `tests/api/env.test.ts`).
- [x] 4. Update the `/globals` management UI and agent Env UI to let operators choose `plain` or `secure` and to display secure values as masked while preserving edit flows (verification: relevant UI files under `app/` or `src/components/`, plus component/UI tests if present).
- [x] 5. Update requirements/design documentation to describe the new attribute, masking rules, and unchanged runtime file generation semantics (verification: `docs/requirements.md`, `docs/design.md`).
- [x] 6. Run verification and regression checks for environment management behavior (verification: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`).

## Future Work

- Consider adding audited reveal controls if operators later need temporary plaintext viewing for secure variables.
- Consider at-rest encryption if the product expands beyond current intranet-only trust assumptions.

## Acceptance #1 Failure Follow-up

- [x] Prevent Agent Env edit flow from overwriting secure values with masked placeholder (`***`) when visibility is changed without entering a new value.
- [x] Add a regression UI/API test that proves secure agent variables keep their runtime value when visibility is edited without replacing the value.
