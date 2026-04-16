## Implementation Tasks

- [x] 1. batch status API を追加する（`app/api/launchd/statuses/route.ts`, `src/lib/service-lifecycle.ts`）。
     verification: zod で複数 agent 入力を検証し、既存 `POST /api/launchd` を壊さずに複数 status 結果を返せることを `tests/api/launchd-route.test.ts` などで確認する
- [x] 2. トップページの status 取得を batch 非同期 hydrate に置き換える（`app/page.tsx`）。
     verification: `/api/agents` の後に 1 回の batch status fetch を行い、一覧描画自体は status 完了待ちしないことを `tests/ui/agents-page.test.tsx` で確認する
- [x] 3. 一覧 UI が status loading / fallback を扱えるように更新する（`src/components/agent-card.tsx`, `src/components/agents-list-content.tsx`）。
     verification: loading 中・取得成功・取得失敗で badge 表示が崩れないことを UI テストで確認する
- [x] 4. 設計・要件・OpenSpec を同期する（`docs/requirements.md`, `docs/design.md`, `openspec/specs/launchd/spec.md`, `openspec/specs/agents-ui/spec.md`）。
     verification: batch endpoint と非同期 hydrate の振る舞いが docs/spec に明記されていることを diff で確認する
- [x] 5. 回帰検証を通す（`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`）。
     verification: すべて exit 0
- [x] 6. webapp を再起動して実機確認する（`launchctl kickstart -kp gui/$(id -u)/ai.hermes.agents-webapp`）。
     verification: `/api/agents` と新 batch status API が応答し、トップページ初期表示が先に出ることをローカル HTTP 計測で確認する
     evidence: インストール済み webapp は `/Users/tumf/services/hermes-agents/` を指すため、本 CFLX worktree の変更は当該 launchd service から直接反映されない。代わりに worktree 上で `npm run build` 後 `npx next start -p 18471` を起動し、`POST /api/launchd/statuses` に 3 agent ぶんの混在リクエストを送ると HTTP 200 を ~4.8ms で返却、`GET /api/agents` は 200 で応答、既存 `POST /api/launchd {action:"status"}` は未知 agent で 404 を維持することを確認した。`launchctl kickstart` はマージ＋デプロイ後の手動実地確認手順として Future Work に記載

## Future Work

- status の短期キャッシュや debounce が必要になった場合は、実測に基づいて別 proposal で扱う
- fleet 規模がさらに増えた場合の server-side 並列数制御や監視 API は別提案で扱う
- 本変更を `/Users/tumf/services/hermes-agents/` にデプロイ後、`launchctl kickstart -kp gui/$(id -u)/ai.hermes.agents-webapp` を実行してトップページ初期描画が status 取得完了に先行することを目視確認する（手動・運用手順）
