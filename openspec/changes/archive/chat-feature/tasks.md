## Implementation Tasks

### Phase 1: セッション/メッセージ閲覧 API + UI

- [x] Task 1: `better-sqlite3` を依存に追加 (verification: `npm ls better-sqlite3`)
- [x] Task 2: `src/lib/state-db.ts` — state.db 読み取りヘルパー実装。`getSessionList(agentHome)` と `getMessages(agentHome, sessionId)` を提供し、state.db 未存在時は空配列を返す (verification: `tests/lib/state-db.test.ts` が GREEN)
- [x] Task 3: `GET /api/agents/[id]/sessions` API 実装。query パラメータ `source?`, `sort?` 対応、zod バリデーション、パス traversal 防止 (verification: `tests/api/sessions.test.ts` が GREEN)
- [x] Task 4: `GET /api/agents/[id]/sessions/[sessionId]/messages` API 実装。zod バリデーション、パス traversal 防止 (verification: `tests/api/messages.test.ts` が GREEN)
- [x] Task 5: Chat タブ UI — セッション一覧パネル実装。source 別アイコン (telegram/cli/tool/etc)、日時・メッセージ数表示、source フィルタ (verification: `tests/components/session-list.test.tsx` が GREEN)
- [x] Task 6: Chat タブ UI — メッセージ表示実装。shadcn AI Elements ベースのバブル UI、user/assistant/tool ロール別スタイル、state.db 未存在時のフォールバック表示 (verification: `tests/components/chat-messages.test.tsx` が GREEN)

### Phase 2: チャット送信 API + UI

- [x] Task 7: `POST /api/agents/[id]/chat` API 実装。body `{ message, sessionId? }`、`execFile` で hermes chat CLI 実行、HERMES_HOME 環境変数設定、タイムアウト 120s、zod バリデーション (verification: `tests/api/chat.test.ts` が GREEN)
- [x] Task 8: Chat タブ UI — メッセージ入力・送信 UI 実装。テキスト入力 + 送信ボタン、送信中ローディング状態、新規セッション / resume 切替 (verification: `tests/components/chat-input.test.tsx` が GREEN)
- [x] Task 9: Chat タブをエージェント詳細ページのタブナビに統合 (verification: `/agents/[id]` で Chat タブが表示される)

### 横断タスク

- [x] Task 10: `docs/design.md` を更新 — §5 API 設計に sessions/messages/chat エンドポイント追加、§7 UI 設計に Chat タブ追加
- [x] Task 11: `npm run test && npm run typecheck && npm run lint` 全パス (verification: CI GREEN)

## Future Work

- SSE ストリーミング対応（hermes RPC Mode 実装後）
- チャット履歴の検索機能
- メッセージ内の tool_calls をインライン展開表示
