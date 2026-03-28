## Implementation Tasks

- [x] Task 1: Memory タブ内にサブタブ状態管理を追加 — `selectedFile` state (`AGENTS.md` | `SOUL.md`) を導入し、切り替えボタン UI を実装 (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx` の `shows only one memory editor at a time` が通る)
- [x] Task 2: グリッド同時表示を単一 FileEditor 表示に変更 — `grid gap-4 lg:grid-cols-2` + 2つの FileEditor を、`selectedFile` に基づく単一 FileEditor に置換 (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx` の `switches memory file` が通る)
- [x] Task 3: 未保存変更時の切り替え確認ダイアログを実装 — `FileEditor` の `dirty` 状態を親に公開し、`window.confirm` で確認後にのみ切り替え (verification: `npm run test -- tests/ui/agent-detail-page.test.tsx` の `asks confirmation before switching` が通る)
- [x] Task 4: 全テスト・lint・typecheck の通過確認 (verification: `npm run test && npm run typecheck && npm run lint`)
