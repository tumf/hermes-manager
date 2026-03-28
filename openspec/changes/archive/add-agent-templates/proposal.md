# Add Agent File Templates

## Problem/Context

- エージェント作成時、`AGENTS.md` / `SOUL.md` / `config.yaml` は固定の最小内容（`# {id}\n` 等）で scaffold される
- 実運用では用途別に異なる初期内容を使いたい（例: Telegram bot 用、Cron 専用、開発用）
- 毎回作成後に手動で同じ内容を貼り付けるのは非効率
- `replace-agent-name-with-auto-id` 提案により名前入力が廃止されるため、Add Agent ダイアログの役割がテンプレート選択に移行する

## Proposed Solution

### テンプレート管理

- DB に `templates` テーブルを追加: `(id PK, fileType TEXT, name TEXT, content TEXT, createdAt, updatedAt)`
  - `fileType`: `'agents.md'` | `'soul.md'` | `'config.yaml'`
  - `name`: テンプレート名（UNIQUE per fileType）
  - `content`: テンプレート内容
- 各 fileType に `default` という名前のテンプレートが初期値として扱われる
- テンプレート CRUD API: `/api/templates`（GET/POST/PUT/DELETE）

### エージェント作成フロー

- "Add Agent" ボタン → ポップアップダイアログ
  - `AGENTS.md` テンプレート選択（ドロップダウン、`default` が初期選択）
  - `SOUL.md` テンプレート選択（同上）
  - `config.yaml` テンプレート選択（同上）
  - 「Create」ボタンで作成
- `POST /api/agents` のボディにテンプレート選択を追加: `{ templates?: { agentsMd?: string, soulMd?: string, configYaml?: string } }`
  - 省略時は各 fileType の `default` テンプレートを使用
  - `default` テンプレートが存在しない場合は現在の固定 scaffold 内容をフォールバック

### テンプレート管理 UI

- `/templates` ページ（新規）またはエージェント詳細の設定内で管理
- テンプレートの追加/編集/削除
- 既存エージェントの `AGENTS.md` / `SOUL.md` / `config.yaml` からテンプレートとして保存する機能（"Save as Template"）

## Acceptance Criteria

- `templates` テーブルが DB に存在し、`fileType` + `name` で UNIQUE 制約がある
- `/api/templates` で CRUD 操作ができる
- "Add Agent" ダイアログで 3 ファイルのテンプレートをそれぞれ選択できる
- `default` テンプレートが初期選択される
- テンプレート未指定時は `default` テンプレートが使われ、`default` が無い場合は固定 scaffold がフォールバック
- テンプレートの追加/編集/削除が UI からできる
- 既存テスト・lint・typecheck がパスする
- `docs/requirements.md` / `docs/design.md` が更新されている

## Out of Scope

- テンプレート内での変数展開（`{{id}}` 等のプレースホルダー置換）は将来検討
- テンプレートの import/export（ファイルからの一括取り込み）
- テンプレートのバージョン管理
