## Specification Tasks

- [x] Update `docs/requirements.md` §8 to remove stale SQLite/drizzle references and align with filesystem-based runtime
- [x] Align backup, monitoring, migration wording with current runtime layout per `docs/design.md`
- [x] Validate proposal and spec delta for archive readiness

## Future Work

- ほかの古い運用記述がないかの横断監査

## Acceptance #1 Failure Follow-up

- [x] Remove or ignore `.cflx/acceptance-state.json` so `git status --porcelain` is clean during acceptance and archive preparation
- [x] Exclude or format `.cflx/acceptance-state.json` so `npm run format:check` passes under repository quality gates
