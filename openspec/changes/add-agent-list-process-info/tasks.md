## Implementation Tasks

- [x] Extend agent list domain/API data with process info fields (`src/lib/agents.ts`, `app/api/agents/route.ts`)
- [x] Add process info discovery helper: launchd PID → RSS, stopped/failed → null
- [x] Add Hermes version discovery helper: `hermes --version` → string, failed → null
- [x] Render Memory / Hermes columns in desktop table and mobile cards (`agents-list-content.tsx`, `agent-card.tsx`)
- [x] Add or update tests for API/data mapping and UI rendering fallbacks (stopped → `--`)
- [x] Run repo checks: `npm run test && npm run typecheck && npm run lint`

## Future Work

- CPU / memory 履歴可視化
- フィルタやソートへの process info 統合

## Acceptance #1 Failure Follow-up

- [x] Remove or ignore untracked `.cflx/` files so `git status --porcelain` is clean during acceptance
