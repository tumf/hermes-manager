## Implementation Tasks

- [x] Add a filesystem-backed partial store under `runtime/partials/` and runtime path helpers for listing, reading, writing, and deleting partial files (verification: repository contains dedicated helper functions and runtime directory bootstrapping)
- [x] Add SOUL assembly helpers that parse `{{partial:name}}`, reject unknown references, and atomically regenerate `SOUL.md` from `SOUL.src.md` (verification: unit tests cover successful assembly and 422-class validation failures)
- [x] Extend `/api/files` to allow `SOUL.src.md`, preserve direct `SOUL.md` editing for legacy agents without `SOUL.src.md`, and rebuild `SOUL.md` on `SOUL.src.md` writes (verification: API tests cover legacy mode, source mode, and error responses)
- [x] Add `/api/partials` CRUD endpoints with zod validation, `usedBy` discovery by scanning `SOUL.src.md`, rebuild-on-update behavior, and 409 rejection for in-use delete operations (verification: API tests cover create/list/update/delete and rebuild side effects)
- [x] Add agent-side enablement flow for partial mode by creating `SOUL.src.md` from the current `SOUL.md` without forcing existing agents to migrate automatically (verification: UI or helper tests cover enable-partials transition)
- [x] Update Memory tab / file editor UI to edit `SOUL.src.md` when present, insert partial references, show assembled `SOUL.md`, and keep `memories/MEMORY.md` / `memories/USER.md` behavior unchanged (verification: component tests cover both legacy and partial-enabled SOUL editing modes)
- [x] Add a Partials management page and navigation entry for listing, creating, editing, and deleting shared partials with usage visibility (verification: component tests cover list/render and delete-blocked states)
- [x] Update docs (`docs/requirements.md`, `docs/design.md`) to describe `runtime/partials/`, `SOUL.src.md`, Files API changes, and the new Partials API/UI surface (verification: docs match the proposal scope and runtime layout)
- [x] Run repo checks: `npm run test && npm run typecheck && npm run lint`

## Acceptance #1 Failure Follow-up

- [x] Remove or ignore the untracked `.cflx/` workspace artifact so `git status --porcelain` is clean during acceptance/archive checks
- [x] Fix formatting for `.cflx/acceptance-state.json` or exclude `.cflx/` from repository formatting gates so `npm run format:check` passes in a clean workspace

## Acceptance #2 Failure Follow-up

- [x] Fix the pre-commit/typecheck flow so `zsh .husky/pre-commit` passes from a clean checkout without requiring a prior `npm run build` to regenerate `.next/types`

## Future Work

- `config.yaml` への partial 適用
- nested partial / dependency graph / reverse index の導入
- テンプレート作成時の partial-aware scaffold
