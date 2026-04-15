# Hermes Manager 設計

最終更新: 2026-04-14

## 1. アーキテクチャ概観

- Next.js App Router（Node ランタイム）
- UI: Tailwind + shadcn/ui
- データ: ファイルシステムベース（runtime/ ディレクトリが唯一のソース・オブ・トゥルース）
- ファイル/実行: Node.js fs/path と child_process.execFile（launchctl/systemctl/dotenvx/hermes）
- 配置: mini ホスト上で直接起動、Caddy 経由で内部公開

### 1.1 製品ポジショニング

- Hermes 公式 dashboard は単一の Hermes install / HERMES_HOME を管理するための UI として位置づける
- Hermes Manager は複数の Hermes Agent を一台のホスト上で配備・運用・再利用するための control plane として位置づける
- そのため、templates / partials / env layering / service lifecycle / per-agent api_server 管理は本製品の中核とする
- Chat / Sessions / Logs / Cron / Skills / Env / Config / MCP は managed agent の運用・診断に必要な範囲で提供する
- 公式 dashboard との feature parity は設計目標にしない

## 2. ドメインモデル

- Agent
  - agentId: string（新規作成時は `[0-9a-z]{7}` を自動生成、既存エージェントは旧 name 形式をそのまま id として使用）
  - home: string（{PROJECT_ROOT}/runtime/agents/{agentId}）
  - label: string（ai.hermes.gateway.{agentId}）
  - enabled: boolean（UIトグル/launchdインストール状態の表示）
  - name: string（ユーザ表示名、`meta.json` の `name`）
  - description: string（ユーザ向け説明、`meta.json` の `description`）
  - tags: string[]（ユーザ管理タグ、`meta.json` の `tags`）
  - apiServerPort: number | null（`meta.json` の `apiServerPort`、範囲 8642〜8699）
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
  - fileName: 'SOUL.md' | 'memories/MEMORY.md' | 'memories/USER.md' | 'config.yaml'（各ファイルは任意サブセット）
  - `runtime/templates/default/` は起動時に自動配置（既存ファイルは上書きしない）
- Partial
  - ストレージ: `runtime/partials/{name}.md`
  - name: string（[a-zA-Z0-9_-]+）
  - content: Markdown text
  - usedBy: `runtime/agents/*/SOUL.src.md` を走査して逆引き

## 3. データ層設計（ファイルシステムベース）

SQLite は使用しない。`runtime/` ディレクトリ構造が唯一のソース・オブ・トゥルース。

### agents → ディレクトリスキャン

`runtime/agents/` 配下のディレクトリを走査。`config.yaml` が存在するディレクトリをエージェントとして認識。
`meta.json` は任意で、未存在時は `name=''`, `description=''`, `tags=[]`, `apiServerPort=undefined` をデフォルト適用。

| フィールド    | 導出元                                              |
| ------------- | --------------------------------------------------- |
| agentId       | ディレクトリ名                                      |
| home          | `runtime/agents/{agentId}` の絶対パス               |
| label         | `ai.hermes.gateway.{agentId}`（規約）               |
| enabled       | `config.yaml` 内の `enabled` フィールド             |
| name          | `meta.json.name`（未存在時は空文字）                |
| description   | `meta.json.description`（未存在時は空文字）         |
| tags          | `meta.json.tags`（未存在時は空配列）                |
| apiServerPort | `meta.json.apiServerPort`（未設定時は `null` 扱い） |
| createdAt     | `fs.stat().birthtime`                               |
| updatedAt     | `fs.stat().mtime`                                   |

### agent metadata → `meta.json`

- パス: `runtime/agents/{agentId}/meta.json`
- 形式:

```json
{
  "name": "Bot A",
  "description": "テスト用",
  "tags": ["dev", "prod"],
  "apiServerPort": 8645
}
```

- 作成時: `POST /api/agents` で `meta` 指定がある場合、または `apiServerPort` 自動採番時に生成
- 新規作成時の `apiServerPort` は 8642〜8699 の範囲で最小未使用ポートを採番し、範囲枯渇時は 409 を返す
- 更新時: `PUT /api/agents/{id}/meta` で `name` / `description` / `tags` を上書き更新し、既存の `apiServerPort` は保持する
- metadata 更新時の副作用: 変更された agentId を `allowedAgents` に含む他 agent を走査し、該当 agent の generated `SOUL.md` を最新 metadata で再 assemble する
- copy 時: 元 agent の `apiServerPort` は引き継がず、新しい未使用ポートを採番して保存する

### delegation → `delegation.json`

- パス: `runtime/agents/{agentId}/delegation.json`
- 形式:

```json
{
  "allowedAgents": ["research01", "coder02"],
  "maxHop": 3
}
```

- 作成/更新時: `PUT /api/agents/{id}/delegation` で zod バリデーション後に保存
- cycle 検出: fleet 全体の delegation graph で DFS を実行し、cycle 形成時は 409 で拒否
- policy 保存時の副作用:
  - `allowedAgents.length > 0` の場合、`hermes-manager-subagent-dispatch` skill を自動 equip
  - `allowedAgents` が空の場合、managed skill を自動削除
  - `SOUL.md` を再生成し、machine-generated subagent YAML block を付与/除去

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

### skill_links → コピー済みスキルディレクトリスキャン

`runtime/agents/{agentId}/skills/` 配下を再帰走査し、`SKILL.md` を含む実ディレクトリを equipped skill として一覧構築。

- equip 時は `~/.agents/skills/{relativePath}` を `{HERMES_HOME}/skills/{relativePath}` へ再帰コピー
- unequip 時は `{HERMES_HOME}/skills/{relativePath}` を再帰削除し、空になった親ディレクトリを prune
- symlink や `.skill-link` のハイブリッド挙動は使用しない

### templates → ファイルシステム

`runtime/templates/{templateName}/` 配下にファイルとして格納

### partials → ファイルシステム

`runtime/partials/{name}.md` に shared SOUL partial を格納し、`runtime/agents/*/SOUL.src.md` の `{{partial:name}}` 参照を走査して `usedBy` を導出する。

## 4. ディレクトリ構成

- /runtime/agents/{agentId}/
  - SOUL.md, SOUL.src.md(optional), config.yaml, .env, logs/, memories/MEMORY.md, memories/USER.md
  - meta.json（任意: name/description/tags）
  - delegation.json（任意: allowedAgents/maxHop — delegation policy）
  - skills/hermes-manager-subagent-dispatch/（delegation enabled 時に自動管理）
- /runtime/templates/{templateName}/
  - SOUL.md, memories/MEMORY.md, memories/USER.md, config.yaml（各ファイルは任意サブセット）
  - `default/` は起動時に自動配置
- /runtime/partials/
  - `{name}.md`（shared SOUL partial）
- /runtime/globals/.env（グローバル環境変数）
- /runtime/globals/.env.meta.json（グローバル visibility メタデータ）
- /runtime/logs/webapp.log, /runtime/logs/webapp.error.log（webapp ログ）

## 5. API 設計（主要ポイント）

- /api/agents: GET/POST/DELETE/copy
  - GET: Agent 一覧に `name` / `description` / `tags` を含める
  - POST: `meta?: { name?: string; description?: string; tags?: string[] }` を受け取り、必要に応じて `meta.json` を生成
- /api/agents/{id}/meta: PUT
  - body: `{ name?: string; description?: string; tags?: string[] }`
  - 振る舞い: `meta.json` を更新し、存在しない agent は 404。既存の `apiServerPort` は保持する
  - 副作用: 更新対象 agent を `allowedAgents` に含む dependent agent の generated `SOUL.md` を再 assemble して、managed subagent block の metadata を最新化する
- /api/agents/{id}/sessions: GET
  - query: `source?: string`, `sort?: 'asc' | 'desc'`
  - 振る舞い: `{agent.home}/state.db` の `sessions` テーブルを読み取り、`started_at` で並び替えて返す（DB未存在時は空配列）
- /api/agents/{id}/sessions/{sessionId}/messages: GET
  - path: `sessionId` は `[a-zA-Z0-9_-]+` のみ許可
  - 振る舞い: `messages` テーブルから対象セッションのメッセージを時系列で返す（DB未存在時は空配列）
- /api/agents/{id}/delegation: GET/PUT
  - GET: `{ policy: { allowedAgents, maxHop }, availableAgents: [{ id, name, description, tags }] }`
  - PUT body: `{ allowedAgents: string[], maxHop: number }`
  - PUT 振る舞い: 自己参照拒否、cycle 検���（409）、target 存在検証、policy 保存後に managed skill sync + SOUL.md 再生成
- /api/agents/{id}/dispatch: POST
  - body: `{ targetAgent: string, message: string, dispatchPath?: string[], hopCount?: number }`
  - 振る舞い: source agent policy を検証（allowedAgents、revisit 防止、maxHop）、target agent の api_server に SSE proxy dispatch
- /api/agents/{id}/chat: POST
  - body: `{ message: string(1..4096) }`
  - 振る舞い: `getAgent()` の `apiServerStatus` / `apiServerPort` を使って upstream (`http://127.0.0.1:<resolved-port>/v1/chat/completions`) に SSE プロキシする。ポート解決優先順は `gateway_state.json.api_server_port` → `meta.json.apiServerPort` → 互換 `.env.API_SERVER_PORT`。有効ポートを確定できない場合は 503 (`api_server not available`) を返し、暗黙の 8642 フォールバックは行わない
- /api/launchd: POST {agent, action}
  - install: write plist → launchctl bootstrap
  - uninstall: bootout → plist削除
  - start: 未 bootstrap の場合は plist を再生成して bootstrap 後に start
  - stop/restart/status
  - restart: stop → 500ms wait → start を順次実行
  - plist EnvironmentVariables は常に `HERMES_HOME` を含み、`meta.json.apiServerPort` が設定されている場合のみ `API_SERVER_ENABLED=true` と `API_SERVER_PORT` を注入する
- /api/files: GET/PUT（SOUL.md/SOUL.src.md/memories/MEMORY.md/memories/USER.md/config.yaml）
  - YAML 構文チェック（config.yaml）
  - 原子書き込み（.tmp→rename）
  - `PUT path=SOUL.md`: `SOUL.src.md` が存在しない legacy agent のみ許可
  - `PUT path=SOUL.src.md`: partial 参照を解決して `SOUL.md` を再生成（失敗時 422、どちらも未更新）
- /api/agents/{id}/mcp: GET/PUT
  - GET: `{ content, docsUrl }` を返し、`config.yaml` の `mcp_servers` サブツリーだけを YAML 文字列として返す。未設定なら `content=''`
  - PUT body: `{ content: string }`
  - PUT 振る舞い: `content` が空白のみなら `mcp_servers` を削除し、非空なら YAML として parse して mapping/object を要求する。更新時は `config.yaml` の他 keys を保持しつつ `mcp_servers` だけを置換して原子的に保存する
- /api/env: GET(.env/parse)/POST/DELETE（visibility を返却/永続化、secure は管理表示でマスク）
- /api/env/resolved: GET（global+agent のマージ、実行値を返却しマスクしない）
- /api/globals: GET/POST/DELETE + regenerate runtime/globals/.env（visibility を返却/永続化、secure は管理表示でマスク）
- /api/skills/tree: GET（~/.agents/skills を再帰走査、SKILL.md 検出、階層ノード返却）
- /api/skills/links: GET（agent-local のコピー済み skill 一覧、`SKILL.md` ベースで relativePath 導出、exists 状態）/POST {agent,relativePath}（`~/.agents/skills` からディレクトリ再帰コピー、既存は 409）/DELETE（コピー済みディレクトリ再帰削除、empty parent pruning）
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
  - file: 'SOUL.md' | 'memories/MEMORY.md' | 'memories/USER.md' | 'config.yaml'
  - name: テンプレート名（[a-zA-Z0-9_-]+）
  - POST /api/agents に templates パラメータ追加: { templates?: { memoryMd?, userMd?, soulMd?, configYaml? } }
  - テンプレート解決順序: 指定テンプレート → default → ハードコードフォールバック
- /api/partials: ファイルシステムベース（runtime/partials/ を直接操作）
  - GET /api/partials → `[{ name, content, usedBy[] }]`
  - GET /api/partials?name=... → `{ name, content, usedBy[] }`
  - POST /api/partials `{ name, content }` → partial 作成（存在時 409）
  - PUT /api/partials `{ name, content }` → partial 更新（未存在 404）
  - DELETE /api/partials?name=... → 未使用時のみ削除（使用中 409 + usedBy）
  - POST/PUT 成功時は `runtime/agents/*/SOUL.src.md` を走査し、参照している agent の `SOUL.md` を再生成

## 6. サービス実行モデル

プラットフォーム検出 (`os.platform()`) に基づき、macOS では launchd、Linux では systemd を使用する。API エンドポイントは `/api/launchd` を互換パスとして維持し、内部でプラットフォーム固有アダプタに委譲する。

### macOS (launchd)

- Hermes gateway
  - ProgramArguments: /bin/bash {PROJECT}/scripts/run-agent-gateway.sh {HERMES_HOME}/.env {PROJECT}/runtime/globals/.env
  - Env: HERMES_HOME={home}（`meta.json.apiServerPort` が設定されている場合のみ `API_SERVER_ENABLED=true` / `API_SERVER_PORT={port}` を追加注入）
  - Stdout/Err: {home}/logs/gateway.log / gateway.error.log
- WebApp 自体
  - ProgramArguments: /bin/bash scripts/start-prod.sh
  - Env: NODE_ENV=production, PORT=18470
  - Stdout/Err: runtime/logs/webapp.log / runtime/logs/webapp.error.log

### Linux (systemd)

- Hermes gateway
  - ExecStart: /bin/bash {PROJECT}/scripts/run-agent-gateway.sh {HERMES_HOME}/.env {PROJECT}/runtime/globals/.env
  - Environment: HERMES_HOME={home}（`meta.json.apiServerPort` が設定されている場合のみ `API_SERVER_ENABLED=true` / `API_SERVER_PORT={port}` を追加注入）
  - StandardOutput/StandardError: append:{home}/logs/gateway.log / gateway.error.log
  - ユニットディレクトリ: ~/.config/systemd/user/
  - ユニット名: ai.hermes.gateway.{agentId}.service
- WebApp 自体
  - ExecStart: /bin/bash scripts/start-prod.sh
  - Environment: NODE_ENV=production, PORT=18470
  - StandardOutput/StandardError: append:runtime/logs/webapp.log / runtime/logs/webapp.error.log
  - ブート時起動: `loginctl enable-linger` でユーザーサービスの永続化が必要

## 7. UI 設計

- Layout: サイドバー（/、/globals、/templates、/partials へのナビ）、モバイルはシート/ドロワ
- Agents 一覧: 表示名（`name` 未設定時は `agentId`）、tags バッジ、enabled, 状態バッジ、Memory、起動/停止、追加（ダイアログ + メタデータ入力 + テンプレート選択、ID自動生成）/削除/コピー（Hermes バージョンは一覧に表示しない）。一覧 UI は fleet inventory と lifecycle 操作を最優先にする
- Agent 詳細: ヘッダーに name/description/tags と Hermes バージョン（未取得時は `--`）を表示、タブ（Metadata/Memory/Config/MCP/Env/Skills/Delegation/Cron/Chat/Logs）。agent detail は managed agent の運用・診断ワークフローを支える範囲に留め、単一 install 向け総合 dashboard の feature parity を目指さない
  - MCP タブは `/api/agents/{id}/mcp` から `config.yaml` の `mcp_servers` フラグメントを load/save する dedicated YAML editor を提供し、upstream Hermes MCP ガイドへのリンクを表示する
  - Metadata タブで name / description / tags を編集・保存する
  - Memory は `SOUL` / `memories/MEMORY.md` / `memories/USER.md` を切替表示
    - legacy mode: `SOUL.md` を直接編集（デフォルト）
    - partial mode: `SOUL.src.md` を編集対象にし、assembled `SOUL.md` を read-only で確認
    - 「Enable Partials」で既存 `SOUL.md` から `SOUL.src.md` を生成して mode 切替
    - partial 一覧から `{{partial:name}}` を SOUL source へ挿入可能
  - Env タブは `/api/env` で agent-local `.env` の CRUD を行う（値はデフォルト masked、`reveal=true` で表示切替）
  - Env タブ内に `/api/env/resolved` の read-only 一覧を表示し、`global` / `agent` / `agent-override` を source として明示
  - Skills タブは `/api/skills/tree` から階層ツリーを表示し、`hasSkill=true` のノードのみ checkbox で equip/unequip、stale link を badge で表示
  - Cron タブは `/api/cron` で job の CRUD を行う
    - ジョブリスト: 名前、スケジュール式、ステート（active/paused/completed）、次回実行予定、最後実行予定
    - ジョブアクション: 作成フォーム（name/schedule/prompt/deliver）、pause/resume/run-now/削除（確認あり）
    - 出力ビューア: ジョブをクリック → `/api/cron/output` で最新実行ファイル一覧表示 → ファイル選択で raw text 内容表示（<pre>）
  - Chat タブは左ペインにセッション一覧（sourceアイコン/日時/メッセージ数/フィルタ）、右ペインにメッセージバブル（user/assistant/tool）と入力フォームを表示。主目的は対象 agent の動作確認、resume/new session 運用、履歴診断である。セッション一覧の上部に検索ボックスを配置し、`state.db` の `messages_fts` テーブル（FTS5）を使った per-agent メッセージ全文検索を提供する。`GET /api/agents/{id}/sessions/search?q=...&source=...&limit=...` で検索し、セッション情報とスニペット付きの結果を返す。検索結果をクリックすると該当セッションを開く。クエリをクリアすると通常のセッション一覧に戻る
  - Chat 入力は「選択セッションを再開する」ONで `sessionId` を送信し、OFFで新規セッションとして送信
- Templates 管理: テンプレート名（ディレクトリ）別グループ表示、ファイル一覧展開、追加/編集/削除ダイアログ
- Partials 管理: partial 一覧、content 表示、usedBy バッジ、追加/編集/削除（使用中は API が 409 を返し UI で理由表示）
- 各 FileEditor に "Save as Template" ボタン（Memory タブの memories/MEMORY.md・memories/USER.md・SOUL.md、Config タブの config.yaml）
- Globals: テーブルで inline 追加/編集/削除、再生成プレビュー
- 公式 dashboard と重複する UI 改善は、multi-agent operations / provisioning / deployment safety を強化する場合のみ採用する
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
- E2E: Playwright を `tests/e2e` 境界で運用（現状は `--pass-with-no-tests` によりランナー疎通確認のみ。実テスト追加時は同ディレクトリに配置）

## 11. 運用とデプロイ

- ビルド: npm run build → next start（または standalone）
- 常駐: macOS は launchd plist、Linux は systemd user unit（webapp）
- Caddy: hermes-manager.mini.tumf.dev → localhost:18470 ← 確定ポート
- 監視: runtime/logs/webapp.log, /api/health（簡易）

### 11.1 Hosting 仕様の運用検証手順

- 起動手順
  - `npm run build`
  - `npm run start:prod`
  - 期待結果: Next.js が `PORT=18470` で起動する（データベース不要）
- launchd ログ出力検証
  - `launchctl list | rg ai.hermes.manager`
  - `ls runtime/logs`
  - 期待結果: `runtime/logs/webapp.log` と `runtime/logs/webapp.error.log` が存在する
- Caddy ルーティング検証
  - `curl -I https://hermes-manager.mini.tumf.dev`
  - 期待結果: HTTPS 応答が返り、WebApp に到達する

## 12. UI ローカライゼーション

### 12.1 i18n アーキテクチャ

- `src/lib/i18n.ts`: locale 定義（10 言語: ja, en, zh-CN, es, pt-BR, vi, ko, ru, fr, de）、デフォルト locale（ja）、localStorage 永続化ヘルパー
- `src/lib/translations/`: TypeScript 型付き辞書。`types.ts` でキー構造を定義し、各 locale ファイルが同一構造を実装
- `src/components/locale-provider.tsx`: React Context + Provider。`useLocale()` hook で `locale`, `setLocale`, `t`（翻訳辞書）を提供
- 辞書グループ: appShell, agentsList, agentDetail, agentStatus, dialogs, chat, memory, logs, templates, partials, globals, common

### 12.2 Language Switcher

- `AppShell` 内のデスクトップサイドバー下部とモバイルヘッダーに配置
- `DropdownMenu` で全 10 言語を表示、選択で即座に UI を再レンダリング
- 選択 locale は `localStorage` に永続化し、ページリロード後も保持
- `document.documentElement.lang` を有効 locale に同期

### 12.3 フォールバック

- 無効な localStorage 値 → デフォルト locale (ja) にフォールバック
- 辞書取得時にキーが見つからない場合 → デフォルト locale の辞書を返却

## 13. 将来拡張

- 認証（イントラ限定 Basic や IP ACL）
- リモートホスト管理（SSH/agent-exec）
- 監査ログと操作履歴
