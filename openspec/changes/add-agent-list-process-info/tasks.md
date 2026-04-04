## Implementation Tasks

- [ ] Extend agent list domain/API data with process info fields (`src/lib/agents.ts`, `app/api/agents/route.ts`)
- [ ] Add process info discovery helper: launchd PID → RSS, stopped/failed → null
- [ ] Add Hermes version discovery helper: `hermes --version` → string, failed → null
- [ ] Render Memory / Hermes columns in desktop table and mobile cards (`agents-list-content.tsx`, `agent-card.tsx`)
- [ ] Add or update tests for API/data mapping and UI rendering fallbacks (stopped → `--`)
- [ ] Run repo checks: `npm run test && npm run typecheck && npm run lint`

## Future Work

- CPU / memory 履歴可視化
- フィルタやソートへの process info 統合
