## Implementation Tasks

- [x] Task 1: Extend the Cron tab job type/state plumbing in `src/components/cron-tab.tsx` so list items can open a dedicated existing-job detail/editor surface and consume the full job payload returned by `GET /api/cron`. (verification: `src/components/cron-tab.tsx` renders an existing-job detail trigger and includes runtime metadata fields in the client-side job type)
- [x] Task 2: Implement the cron job detail/editor UI in `src/components/cron-tab.tsx` (or a colocated extracted component) with editable fields `name`, `schedule`, `prompt`, `skills`, `deliver`, `repeat`, `model`, `provider` plus read-only runtime fields such as `id`, `state`, `enabled`, `created_at`, `next_run_at`, `last_run_at`, `last_status`, and `last_error`. (verification: component source contains form controls for editable fields and rendered runtime metadata labels)
- [x] Task 3: Wire save handling for existing jobs to `PUT /api/cron`, including API error display and refresh of the jobs list after a successful save. (verification: `src/components/cron-tab.tsx` issues `fetch('/api/cron', { method: 'PUT', ... })` for existing jobs and re-runs the job fetch on success)
- [x] Task 4: Add or update tests covering the edit workflow and validation/error handling for existing jobs, using repository-local fixtures/mocks only. (verification: a cron-related test file under `tests/` covers opening/editing/saving an existing job and passes under `npm run test`)
- [x] Task 5: Update `docs/requirements.md` and `docs/design.md` so the Cron tab behavior explicitly includes existing-job detail viewing and editing. (verification: both docs mention existing-job detail/edit behavior in the Cron tab section)
- [x] Task 6: Run `npm run test && npm run typecheck && npm run lint` after the implementation changes. (verification: all three commands are recorded as passing for the implementation branch)

## Future Work

- Consider whether additional runtime-owned fields such as `origin` or provider-specific settings should be surfaced later if real operator demand appears.
- Consider extracting the cron editor into a reusable dialog/drawer component only if the inline implementation becomes too large to maintain.
