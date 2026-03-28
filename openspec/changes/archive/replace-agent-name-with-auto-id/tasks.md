## Implementation Tasks

- [x] Task 1: `src/lib/id.ts` に ID 生成関数を作成 — `generateAgentId(): string` で `[0-9a-z]{7}` のランダム文字列を返す。`crypto.randomBytes` + base36 変換を使用 (verification: `npm run typecheck` パス、ユニットテストで形式・ユニーク性を確認)
- [x] Task 2: DB スキーマ変更 — `db/schema.ts` の `agents` テーブルで `name` カラムを `agentId` に変更（カラム名 `agent_id`、型 text NOT NULL UNIQUE）。`env_vars.scope` / `skill_links.agent` は値として id を格納するため型変更不要 (verification: `npm run db:generate` でマイグレーション生成、`npm run typecheck` パス)
- [x] Task 3: バリデータ更新 — `src/lib/validators/agents.ts` の `CreateAgentSchema` からボディの `name` フィールドを削除。`CopyAgentSchema` を `{ from: string }` のみに変更。全バリデータで `name` → `id` のパラメータ名に統一 (verification: `npm run typecheck` パス)
- [x] Task 4: `POST /api/agents` 更新 — ボディ不要に変更、`generateAgentId()` で id を生成、衝突時リトライ（最大 5 回）、`home` / `label` / 初期ファイル内の `{name}` → `{id}` に変更 (verification: `npm run typecheck` パス、テストで id 形式 `[0-9a-z]{7}` を確認)
- [x] Task 5: `POST /api/agents/copy` 更新 — `to` パラメータを削除、`generateAgentId()` で新 id を自動生成 (verification: `npm run typecheck` パス)
- [x] Task 6: `DELETE /api/agents` 更新 — クエリパラメータ `name` → `id` に変更 (verification: `npm run typecheck` パス)
- [x] Task 7: 全 API ルートの agent 参照更新 — `/api/launchd`, `/api/files`, `/api/env`, `/api/env/resolved`, `/api/skills/links`, `/api/logs`, `/api/logs/stream`, `/api/cron`, `/api/cron/action`, `/api/cron/output` で `agents.name` → `agents.agentId` に DB クエリを更新 (verification: `npm run typecheck && npm run lint` パス)
- [x] Task 8: `src/lib/launchd.ts` 更新 — `getPlistPath` / `generatePlist` が agent id を受け取るように変更 (verification: `npm run typecheck` パス)
- [x] Task 9: UI トップページ更新 — `app/page.tsx` の Add Agent フォームから名前入力フィールドを削除、ボタン押下で直接 `POST /api/agents` を呼び出す。コピー時も名前入力ダイアログを削除し確認のみに変更。一覧表示の `a.name` → `a.agentId` (verification: `npm run typecheck && npm run lint` パス)
- [x] Task 10: UI 詳細ページ更新 — `app/agents/[name]/` を `app/agents/[id]/` にリネーム、`page.tsx` 内の `name` 参照を `id` に変更 (verification: `npm run typecheck && npm run lint` パス)
- [x] Task 11: `src/components/cron-tab.tsx` 更新 — `agentName` prop を `agentId` に変更、API 呼び出しのパラメータ名を統一 (verification: `npm run typecheck` パス) — Note: CronTab の `name` prop はそのまま使用（内部変数名の変更のみ）、API パラメータ `agent` は agentId を値として渡す設計で変更不要
- [x] Task 12: テスト更新 — `tests/` 配下の既存テストを id ベースに修正、`src/lib/id.ts` のユニットテストを追加 (verification: `npm run test` パス)
- [x] Task 13: ドキュメント更新 — `docs/requirements.md` と `docs/design.md` の agent name 関連記述を agent id に変更 (verification: ドキュメント内の `{name}` が `{id}` に置換されている)
- [x] Task 14: 全チェック通過確認 (verification: `npm run test && npm run typecheck && npm run lint && npm run format:check`)

## Future Work

- ユーザーが任意の表示名（displayName）を設定できるカラムの追加
- テンプレート選択機能の実装（Add Agent ダイアログでテンプレートを選ぶ）
- 既存エージェントの旧 name 形式を `[0-9a-z]{7}` に強制リネームするマイグレーション
