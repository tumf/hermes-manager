# Replace Agent Name with Auto-Generated ID

## Problem/Context

- 現在エージェント作成時にユーザーが `name`（`[a-zA-Z0-9_-]+`）を手動入力している
- テンプレート機能（今後実装予定）では "Add Agent" ボタン押下 → テンプレート選択のみのフローにしたい
- ユーザーに命名を強いるのは不要な摩擦であり、テンプレート中心のワークフローに合わない
- `name` は DB・ファイルシステム・launchd ラベル・env_vars.scope・skill_links.agent の 6 ドメインに跨る識別子

## Proposed Solution

- `agents.name` カラムを廃止し、新たに `agents.id` として `[0-9a-z]{7}` のランダムユニーク値をシステムが自動生成する
- `POST /api/agents` はボディ不要（将来テンプレート選択パラメータのみ受け取る）に変更
- `POST /api/agents/copy` は `{ from }` のみ受け取り、`to` は自動生成
- ファイルシステムパス: `runtime/agents/{id}/`
- launchd ラベル: `ai.hermes.gateway.{id}`
- `env_vars.scope` / `skill_links.agent`: agent id を格納
- URL ルーティング: `/agents/[id]`
- API パラメータ名 `agent` / `name` の値が id になる（パラメータ名自体の変更は最小限）
- 既存エージェントは旧 name をそのまま id として移行（バリデーションは新規作成時のみ `[0-9a-z]{7}` を強制）

## Acceptance Criteria

- `POST /api/agents` がボディなしで呼び出せ、レスポンスに自動生成された `id`（`[0-9a-z]{7}`）が含まれる
- 生成された id が DB・ファイルシステム・launchd ラベルで一貫して使用される
- `POST /api/agents/copy` が `{ from }` のみで動作し、新 id が自動生成される
- UI の "Add Agent" ボタンで名前入力が不要になる
- UI のエージェント一覧・詳細ページで id が表示される
- 既存エージェント（旧 name 形式）が正常に動作し続ける
- 全既存テスト・lint・typecheck がパスする
- `docs/requirements.md` と `docs/design.md` が変更内容と一致する

## Out of Scope

- ユーザーが設定できる displayName / 表示名の追加（将来検討）
- テンプレート選択機能の実装（別提案）
- 既存エージェントの id を強制的に `[0-9a-z]{7}` 形式にリネームするマイグレーション
