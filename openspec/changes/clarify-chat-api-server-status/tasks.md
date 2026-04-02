## Implementation Tasks

- [x] Task 1: api_server 詳細状態判定の追加 — `src/lib/gateway-discovery.ts` に `disabled` / `configured-needs-restart` / `starting` / `connected` / `error` を返す関数を追加し、global env・agent env・gateway_state.json・platform connected 状態を区別する (verification: `tests/lib/gateway-discovery.test.ts` に各状態のユニットテストを追加し `npm run test` で通過)
- [x] Task 2: Agent API の状態公開 — `src/lib/agents.ts` と `app/api/agents/[id]/route.ts` が `apiServerStatus` を返し、`apiServerAvailable` を残す場合は `connected` から導出する (verification: `tests/api/agents.test.ts` と `tests/api/agent-id.test.ts` で `apiServerStatus` を確認)
- [x] Task 3: Chat API の 503 理由明確化 — `app/api/agents/[id]/chat/route.ts` が `apiServerStatus !== connected` の場合に状態識別可能なエラー payload を返す (verification: `tests/api/chat.test.ts` で 503 レスポンスの理由を検証する)
- [x] Task 4: Chat タブの状態別ガイダンス実装 — `src/components/chat-tab.tsx` が `disabled` / `configured-needs-restart` / `starting` / `error` ごとに異なるメッセージを表示し、global env 設定済みだが未反映のケースを正しく案内する (verification: `tests/ui/agent-detail-page.test.tsx` に状態別 UI テストを追加し `npm run test` で通過)
- [x] Task 5: typecheck / lint / test 通過確認 — `npm run typecheck && npm run lint && npm run test` が全て通過する (verification: コマンド実行で exit 0)

## Future Work

- Chat タブから gateway 再起動を直接実行する導線
- `API_SERVER_KEY` を含む有効化ガイダンスの詳細化
