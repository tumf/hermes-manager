# Hermes Agents WebApp 設計

最終更新: 2026-03-29

## 1. アーキテクチャ概観

- Next.js App Router（Node ランタイム）
- UI: Tailwind + shadcn/ui
- データ: ファイルシステムベース（runtime/ ディレクトリが唯一のソース・オブ・トゥルース）
- ファイル/実行: Node.js fs/path と child_process.execFile（launchctl/dotenvx/hermes）
- 配置: mini ホスト上で直接起動、Caddy 経由で内部公開

## 2. ドメインモデル

- Agent
  - agentId: string（新規作成時は `[0-9a-z]{7}` を自動生成、既存エージェントは旧 name 形式をそのまま id として使用）
  - home: string（{PROJECT_ROOT}/runtime/agents/{agentId}）
  - label: string（ai.hermes.gateway.{agentId}）
  - enabled: boolean（UIトグル/launchdインストール状態の表示）
  - name: string（ユーザ表示名、`meta.json` の `name`）
  - description: string（ユーザ向け説明、`meta.json` の `description`）
  - tags: string[]（ユーザ管理タグ、`meta.json` の `tags`）
  - createdAt/updatedAt: number(ms)
- EnvVar
  - scope: 'global' | agentId
  - key: string
  - value: string
  - visibility: 'plain' | 'secure'（管理画面でのマスク制御）
- SkillLink
  - agent: string
  - sourcePath: string（~/.agents/skills 配下、カノニカルまたは互換レガシー）
  - targetPath: string（{HERMES_HOME}/skills/{relativePath}、階層構造保持）
- Template（ファイルシステムベース）
  - ストレージ: `runtime/templates/{templateName}/{fileName}`
  - templateName: string（ディレクトリ名、[a-zA-Z0-9_-]+）
  - fileName: 'AGENTS.md' | 'SOUL.md' | 'config.yaml'（各ファイルは任意サブセット）
  - `runtime/templates/default/` は起動時に自動配置（既存ファイルは上書きしない）

## 3. データ層設計（ファイルシステムベース）

SQLite は使用しない。`runtime/` ディレクトリ構造が唯一のソース・オブ・トゥルース。

### agents → ディレクトリスキャン

`runtime/agents/` 配下のディレクトリを走査。`config.yaml` が存在するディレクトリをエージェントとして認識。
`meta.json` は任意で、未存在時は `name=''`, `description=''`, `tags=[]` をデフォルト適用。

| フィールド  | 導出元                                      |
| ----------- | ------------------------------------------- |
| agentId     | ディレクトリ名                              |
| home        | `runtime/agents/{agentId}` の絶対パス       |
| label       | `ai.hermes.gateway.{agentId}`（規約）       |
| enabled     | `config.yaml` 内の `enabled` フィールド     |
| name        | `meta.json.name`（未存在時は空文字）        |
| description | `meta.json.description`（未存在時は空文字） |
| tags        | `meta.json.tags`（未存在時は空配列）        |
| createdAt   | `fs.stat().birthtime`                       |
| updatedAt   | `fs.stat().mtime`                           |

### agent metadata → `meta.json`

- パス: `runtime/agents/{agentId}/meta.json`
- 形式:

```json
{
  "name": "Bot A",
  "description": "テスト用",
  "tags": ["dev", "prod"]
}
```

- 作成時: `POST /api/agents` で `meta` 指定がある場合のみ生成
- 更新時: `PUT /api/agents/{id}/meta` で上書き更新

### env_vars → `.env` + `.env.meta.json`

- キー/値ペア: `.env` ファイル（グローバルは `runtime/globals/.env`、エージェント固有は `runtime/agents/{agentId}/.env`）
- visibility メタデータ: `.env.meta.json` サイドカーファイル

`.env.meta.json` 形式:

```json
{
  "API_KEY": { "visibility": "secure" },
  "APP_NAME": { "visibility": "plain" }
}
```

### skill_links → シンボリックリンクスキャン

`runtime/agents/{agentId}/skills/` 配下のシンボリックリンクを再帰走査して一覧構築。

- 通常 skill は `{HERMES_HOME}/skills/{relativePath}` に symlink を作成
- 子 skill も持つ hybrid skill は `{HERMES_HOME}/skills/{relativePath}/.skill-link` に自己参照 symlink を作成し、子 skill 用ディレクトリと共存させる

### templates → ファイルシステム

`runtime/templates/{templateName}/` 配下にファイルとして格納

## 4. ディレクトリ構成

- /runtime/agents/{agentId}/
  - AGENTS.md, SOUL.md, config.yaml, .env, logs/
  - meta.json（任意: name/description/tags）
- /runtime/templates/{templateName}/
  - AGENTS.md, SOUL.md, config.yaml（各ファイルは任意サブセット）
  - `default/` は起動時に自動配置
- /runtime/globals/.env（グローバル環境変数）
- /runtime/globals/.env.meta.json（グローバル visibility メタデータ）
- /runtime/logs/webapp.log, /runtime/logs/webapp.error.log（webapp ログ）

## 5. API 設計（主要ポイント）

- /api/agents: GET/POST/DELETE/copy
  - GET: Agent 一覧に `name` / `description` / `tags` を含める
  - POST: `meta?: { name?: string; description?: string; tags?: string[] }` を受け取り、必要に応じて `meta.json` を生成
- /api/agents/{id}/meta: PUT
  - body: `{ name?: string; description?: string; tags?: string[] }`
  - 振る舞い: `meta.json` を更新し、存在しない agent は 404
- /api/agents/{id}/sessions: GET
  - query: `source?: string`, `sort?: 'asc' | 'desc'`
  - 振る舞い: `{agent.home}/state.db` の `sessions` テーブルを読み取り、`started_at` で並び替えて返す（DB未存在時は空配列）
- /api/agents/{id}/sessions/{sessionId}/messages: GET
  - path: `sessionId` は `[a-zA-Z0-9_-]+` のみ許可
  - 振る舞い: `messages` テーブルから対象セッションのメッセージを時系列で返す（DB未存在時は空配列）
- /api/agents/{id}/chat: POST
  - body: `{ message: string(1..4096), sessionId?: string }`
  - 振る舞い: `execFile('hermes', ['chat', ...])` で `hermes chat -q <message> -Q --source tool` を実行。`sessionId` 指定時は `--resume` を付与。`HERMES_HOME={agent.home}`、timeout=120s
- /api/launchd: POST {agent, action}
  - install: write plist → launchctl bootstrap
  - uninstall: bootout → plist削除
  - start: 未 bootstrap の場合は plist を再生成して bootstrap 後に start
  - stop/restart/status
  - restart: stop → 500ms wait → start を順次実行
- /api/files: GET/PUT（AGENTS.md/SOUL.md/config.yaml）
  - YAML 構文チェック（config.yaml）
  - 原子書き込み（.tmp→rename）
- /api/env: GET(.env/parse)/POST/DELETE（visibility を返却/永続化、secure は管理表示でマスク）
- /api/env/resolved: GET（global+agent のマージ、実行値を返却しマスクしない）
- /api/globals: GET/POST/DELETE + regenerate runtime/globals/.env（visibility を返却/永続化、secure は管理表示でマスク）
- /api/skills/tree: GET（~/.agents/skills を再帰走査、SKILL.md 検出、階層ノード返却）
- /api/skills/links: GET（agent-local link 一覧、relativePath 導出、exists 状態）/POST {agent,relativePath}（symlink 作成、hybrid skill は `.skill-link` を使用）/DELETE（symlink 削除、empty parent pruning）
- /api/logs: tail 相当
- /api/logs/stream: SSE keepalive/polling
- /api/cron: GET/POST/PUT/DELETE（{agent.home}/cron/jobs.json の CRUD、原子書き込み）
  - job フィールド: id, name, schedule, prompt, skills, state, enabled, next_run_at, last_run_at, deliver 等
  - schedule フォーマット: 5-field cron ("0 9 \* \* \*"), interval ("30m", "2h", "1d"), ISO timestamp
- /api/cron/action: POST {agent, id, action} where action ∈ {pause, resume, run}
  - pause: state='paused', enabled=false
  - resume: state='scheduled', enabled=true
  - run: next_run_at=now（即時実行トリガー）
- /api/cron/output: GET {agent, id, [file]}
  - ファイル一覧: {agent.home}/cron/output/{id}/\*.md をリスト（newest-first）
  - ファイル内容: 指定した .md ファイル の raw text 返却
- /api/templates: ファイルシステムベース（runtime/templates/ を直接操作）
  - GET /api/templates → `[{ name, files }]` テンプレート一覧
  - GET /api/templates?name=...&file=... → `{ name, file, content }` 個別ファイル取得
  - POST /api/templates `{ name, file, content }` → ファイル作成（409 on duplicate）
  - PUT /api/templates `{ name, file, content }` → ファイル更新（404 if not found）
  - DELETE /api/templates?name=...&file=... → ファイル削除
  - DELETE /api/templates?name=... → テンプレートディレクトリ一括削除
  - file: 'AGENTS.md' | 'SOUL.md' | 'config.yaml'
  - name: テンプレート名（[a-zA-Z0-9_-]+）
  - POST /api/agents に templates パラメータ追加: { templates?: { agentsMd?, soulMd?, configYaml? } }
  - テンプレート解決順序: 指定テンプレート → default → ハードコードフォールバック

## 6. Launchd 実行モデル

- Hermes gateway
  - ProgramArguments: /bin/bash {PROJECT}/scripts/run-agent-gateway.sh {HERMES_HOME}/.env {PROJECT}/runtime/globals/.env
  - Env: HERMES_HOME={home}
  - Stdout/Err: {home}/logs/gateway.log / gateway.error.log
- WebApp 自体
  - ProgramArguments: node ./.next/standalone/server.js（もしくは next start）
  - Env: NODE_ENV=production, PORT=18470 ← 確定ポート
  - Stdout/Err: runtime/logs/webapp.log / runtime/logs/webapp.error.log

## 7. UI 設計

- Layout: サイドバー（/、/globals、/templates へのナビ）、モバイルはシート/ドロワ
- Agents 一覧: 表示名（`name` 未設定時は `agentId`）、tags バッジ、enabled, 状態バッジ、起動/停止、追加（ダイアログ + メタデータ入力 + テンプレート選択、ID自動生成）/削除/コピー
- Agent 詳細: ヘッダーに name/description/tags の表示のみ、タブ（Metadata/Memory/Config/Env/Skills/Cron/Chat/Logs）
  - Metadata タブで name / description / tags を編集・保存する
  - Memory は `AGENTS.md` / `SOUL.md` を切替ボタンで選択し、常に1ファイルのみ編集表示
  - Env タブは `/api/env` で agent-local `.env` の CRUD を行う（値はデフォルト masked、`reveal=true` で表示切替）
  - Env タブ内に `/api/env/resolved` の read-only 一覧を表示し、`global` / `agent` / `agent-override` を source として明示
  - Skills タブは `/api/skills/tree` から階層ツリーを表示し、`hasSkill=true` のノードのみ checkbox で equip/unequip、stale link を badge で表示
  - Cron タブは `/api/cron` で job の CRUD を行う
    - ジョブリスト: 名前、スケジュール式、ステート（active/paused/completed）、次回実行予定、最後実行予定
    - ジョブアクション: 作成フォーム（name/schedule/prompt/deliver）、pause/resume/run-now/削除（確認あり）
    - 出力ビューア: ジョブをクリック → `/api/cron/output` で最新実行ファイル一覧表示 → ファイル選択で raw text 内容表示（<pre>）
  - Chat タブは左ペインにセッション一覧（sourceアイコン/日時/メッセージ数/フィルタ）、右ペインにメッセージバブル（user/assistant/tool）と入力フォームを表示
  - Chat 入力は「選択セッションを再開する」ONで `sessionId` を送信し、OFFで新規セッションとして送信
- Templates 管理: テンプレート名（ディレクトリ）別グループ表示、ファイル一覧展開、追加/編集/削除ダイアログ
- 各 FileEditor に "Save as Template" ボタン（Memory タブの AGENTS.md/SOUL.md、Config タブの config.yaml）
- Globals: テーブルで inline 追加/編集/削除、再生成プレビュー
- コンポーネント: StatusBadge, ConfirmDialog, EnvTable, LogViewer, CronTab, CronJobDialog, TemplateSelect

## 8. バリデーション/安全性

- zod で body/query を厳格検証
- パス正規化 & traversal 防止（resolve→startsWith(home)）
- child_process.execFile で引数配列渡し（shell false）
- ログ/SSE は読み取り専用で 1,000 行程度に制限

## 9. エラーハンドリング

- API は {ok:false,error} or {stdout,stderr,code} を一貫返却
- UI は toast/バナーで通知、状態同期（再取得）

## 10. テスト方針

- API: 単体（zod/関数）、一部統合（tmpdir ベースのファイルシステムフィクスチャ）
- UI: コンポーネントテスト（Testing Library）
- E2E は将来（Playwright）

## 11. 運用とデプロイ

- ビルド: npm run build → next start（または standalone）
- 常駐: launchd plist（webapp）
- Caddy: hermes-agents.mini.tumf.dev → localhost:18470 ← 確定ポート
- 監視: runtime/logs/webapp.log, /api/health（簡易）

### 11.1 Hosting 仕様の運用検証手順

- 起動手順
  - `npm run build`
  - `npm run start:prod`
  - 期待結果: Next.js が `PORT=18470` で起動する（データベース不要）
- launchd ログ出力検証
  - `launchctl list | rg ai.hermes.agents-webapp`
  - `ls runtime/logs`
  - 期待結果: `runtime/logs/webapp.log` と `runtime/logs/webapp.error.log` が存在する
- Caddy ルーティング検証
  - `curl -I https://hermes-agents.mini.tumf.dev`
  - 期待結果: HTTPS 応答が返り、WebApp に到達する

## 12. 将来拡張

- 認証（イントラ限定 Basic や IP ACL）
- リモートホスト管理（SSH/agent-exec）
- 監査ログと操作履歴
