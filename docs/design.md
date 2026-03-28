# Hermes Agents WebApp 設計

最終更新: 2026-03-27

## 1. アーキテクチャ概観

- Next.js App Router（Node ランタイム）
- UI: Tailwind + shadcn/ui
- データ: Drizzle ORM + better-sqlite3（./runtime/data/app.db）
- ファイル/実行: Node.js fs/path と child_process.execFile（launchctl/dotenvx/hermes）
- 配置: mini ホスト上で直接起動、Caddy 経由で内部公開

## 2. ドメインモデル

- Agent
  - name: string(/[a-zA-Z0-9_-]+/)
  - home: string（{PROJECT_ROOT}/runtime/agents/{name}）
  - label: string（ai.hermes.gateway.{name}）
  - enabled: boolean（UIトグル/launchdインストール状態の表示）
  - createdAt/updatedAt: number(ms)
- EnvVar
  - scope: 'global' | agentName
  - key: string
  - value: string
  - visibility: 'plain' | 'secure'（管理画面でのマスク制御）
- SkillLink
  - agent: string
  - sourcePath: string（~/.agents/skills 配下、カノニカルまたは互換レガシー）
  - targetPath: string（{HERMES_HOME}/skills/{relativePath}、階層構造保持）

## 3. データベース設計

- agents(id PK, name UNIQUE, home, label, enabled BOOL, created_at, updated_at)
- env_vars(id PK, scope, key, value, visibility DEFAULT 'plain')
- skill_links(id PK, agent, source_path, target_path)

インデックス案:

- agents.name UNIQUE
- env_vars(scope, key)
- skill_links(agent)

## 4. ディレクトリ構成

- /runtime/agents/{name}/
  - AGENTS.md, SOUL.md, config.yaml, .env, logs/
- /runtime/globals/.env（DB の global vars から自動生成）
- /runtime/data/app.db（SQLite）
- /runtime/logs/webapp.log, /runtime/logs/webapp.error.log（webapp ログ）

## 5. API 設計（主要ポイント）

- /api/agents: GET/POST/DELETE/copy
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
- /api/skills/links: GET（agent-local link 一覧、relativePath 導出、exists 状態）/POST {agent,relativePath}（symlink 作成、hierarchical target）/DELETE（symlink 削除、empty parent pruning）
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

- Layout: サイドバー（/ と /globals へのナビ）、モバイルはシート/ドロワ
- Agents 一覧: name, enabled, 状態バッジ、起動/停止、追加/削除/コピー
- Agent 詳細: タブ（Memory/Config/Env/Skills/Cron/Logs）
  - Memory は `AGENTS.md` / `SOUL.md` を切替ボタンで選択し、常に1ファイルのみ編集表示
  - Env タブは `/api/env` で agent-local `.env` の CRUD を行う（値はデフォルト masked、`reveal=true` で表示切替）
  - Env タブ内に `/api/env/resolved` の read-only 一覧を表示し、`global` / `agent` / `agent-override` を source として明示
  - Skills タブは `/api/skills/tree` から階層ツリーを表示し、`hasSkill=true` のノードのみ checkbox で equip/unequip、stale link を badge で表示
  - Cron タブは `/api/cron` で job の CRUD を行う
    - ジョブリスト: 名前、スケジュール式、ステート（active/paused/completed）、次回実行予定、最後実行予定
    - ジョブアクション: 作成フォーム（name/schedule/prompt/deliver）、pause/resume/run-now/削除（確認あり）
    - 出力ビューア: ジョブをクリック → `/api/cron/output` で最新実行ファイル一覧表示 → ファイル選択で raw text 内容表示（<pre>）
- Globals: テーブルで inline 追加/編集/削除、再生成プレビュー
- コンポーネント: StatusBadge, ConfirmDialog, EnvTable, LogViewer, CronTab, CronJobDialog

## 8. バリデーション/安全性

- zod で body/query を厳格検証
- パス正規化 & traversal 防止（resolve→startsWith(home)）
- child_process.execFile で引数配列渡し（shell false）
- ログ/SSE は読み取り専用で 1,000 行程度に制限

## 9. エラーハンドリング

- API は {ok:false,error} or {stdout,stderr,code} を一貫返却
- UI は toast/バナーで通知、状態同期（再取得）

## 10. テスト方針

- API: 単体（zod/関数）、一部統合（sqliteをtempコピー）
- UI: コンポーネントテスト（Testing Library）
- E2E は将来（Playwright）

## 11. 運用とデプロイ

- ビルド: npm run build → next start（または standalone）
- 常駐: launchd plist（webapp）
- Caddy: hermes-agents.mini.tumf.dev → localhost:18470 ← 確定ポート
- 監視: runtime/logs/webapp.log, /api/health（簡易）

### 11.1 既存環境の runtime 移行

- 実行コマンド: `npm run migrate:runtime -- --dry-run --verbose`（事前確認）
- 実適用: `npm run migrate:runtime -- --verbose`
- 移行内容:
  - `agents/`, `globals/`, `data/`, `logs/` を `runtime/` 配下へコピー＆旧ディレクトリ削除
  - SQLite `agents.home` の旧パス（`{PROJECT_ROOT}/agents/*`）を `runtime/agents/*` へ更新
  - launchd は WebUI から uninstall → install → start で plist を再生成

### 11.2 Hosting 仕様の運用検証手順

- 起動手順（マイグレーション込み）
  - `npm run build`
  - `npm run start:prod`
  - 期待結果: `scripts/migrate.js` が先に実行され、`runtime/data/app.db` 内の必須テーブル作成後に Next.js が `PORT=18470` で起動する
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
