## Implementation Tasks

- [x] `src/lib/agents.ts` の現行責務と重複箇所を整理し、分離対象（metadata/filesystem helper、port allocator、Agent DTO builder）を確定する（verification: manual - `src/lib/agents.ts` の責務マップを proposal/design/spec と照合する）
- [x] characterization test を先に追加し、`listAgents()` / `getAgent()` / `createAgent()` / `allocateApiServerPort()` の既存挙動を固定する（verification: automated - `npm run test -- tests/lib/agents.test.ts tests/lib/api-server-port.test.ts`）
- [x] `agent-fs.ts`（metadata/filesystem helper）、`agent-port.ts`（port allocator）、`agent-view.ts`（Agent DTO builder）に分離し、`agents.ts` を facade 化する（verification: automated - `npm run test && npm run typecheck && npm run lint`）
- [x] Agent runtime helper の分離後も API 形状・legacy `.env` fallback・metadata 永続化が不変であることを spec に反映する（verification: manual - `openspec/changes/refactor-agent-runtime-helpers/specs/agent-runtime-helpers/spec.md`）
- [x] strict validation を通す（verification: automated - `python3 /Users/tumf/.hermes/skills/cflx-proposal/scripts/cflx.py validate refactor-agent-runtime-helpers --strict`）

## Future Work

- process 情報取得を lazy loading / 並列制御で最適化する
- Agent filesystem helper を service manager や files API から再利用できるように公開境界を見直す
