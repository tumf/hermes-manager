# Hermes Agents WebApp 設計

最終更新: 2026-03-27

## 1. アーキテクチャ概観
- Next.js App Router（Node ランタイム）
- UI: Tailwind + shadcn/ui
- データ: Drizzle ORM + better-sqlite3（./data/app.db）
- ファイル/実行: Node.js fs/path と child_process.execFile（launchctl/dotenvx/hermes）
- 配置: mini ホスト上で直接起動、Caddy 経由で内部公開

## 2. ドメインモデル
- Agent
  - name: string(/[a-zA-Z0-9_-]+/)
  - home: string（{PROJECT_ROOT}/agents/{name}）
  - label: string（ai.hermes.gateway.{name}）
  - enabled: boolean（UIトグル/launchdインストール状態の表示）
  - createdAt/updatedAt: number(ms)
- EnvVar
  - scope: 'global' | agentName
  - key: string
  - value: string
- SkillLink
  - agent: string
  - sourcePath: string（~/.hermes/skills 配下）
  - targetPath: string（{HERMES_HOME}/skills/{basename}）

## 3. データベース設計
- agents(id PK, name UNIQUE, home, label, enabled BOOL, created_at, updated_at)
- env_vars(id PK, scope, key, value)
- skill_links(id PK, agent, source_path, target_path)

インデックス案:
- agents.name UNIQUE
- env_vars(scope, key)
- skill_links(agent)

## 4. ディレクトリ構成
- /agents/{name}/
  - AGENTS.md, SOUL.md, config.yaml, .env, logs/
- /globals/.env（DB の global vars から自動生成）
- /data/app.db（SQLite）

## 5. API 設計（主要ポイント）
- /api/agents: GET/POST/DELETE/copy
- /api/launchd: POST {agent, action}
  - install: write plist → launchctl bootstrap
  - uninstall: bootout → plist削除
  - start/stop/status
- /api/files: GET/PUT（AGENTS.md/SOUL.md/config.yaml）
  - YAML 構文チェック（config.yaml）
  - 原子書き込み（.tmp→rename）
- /api/env: GET(.env/parse)/POST/DELETE
- /api/env/resolved: GET（global+agent のマージ）
- /api/globals: GET/POST/DELETE + regenerate globals/.env
- /api/skills/tree, /api/skills/links{GET/POST/DELETE}
- /api/logs: tail 相当
- /api/logs/stream: SSE keepalive/polling

## 6. Launchd 実行モデル
- Hermes gateway
  - ProgramArguments: /usr/local/bin/dotenvx run -f {HERMES_HOME}/.env -f {PROJECT}/globals/.env -- hermes gateway
  - Env: HERMES_HOME={home}
  - Stdout/Err: {home}/logs/gateway.log / gateway.error.log
- WebApp 自体
  - ProgramArguments: node ./.next/standalone/server.js（もしくは next start）
  - Env: NODE_ENV=production, PORT=18470
  - Stdout/Err: logs/webapp.log / webapp.error.log

## 7. UI 設計
- Layout: サイドバー（/ と /globals へのナビ）、モバイルはシート/ドロワ
- Agents 一覧: name, enabled, 状態バッジ、起動/停止、追加/削除/コピー
- Agent 詳細: タブ（Memory/Config/Env/Skills/Logs）
- Globals: テーブルで inline 追加/編集/削除、再生成プレビュー
- コンポーネント: StatusBadge, ConfirmDialog, EnvTable, LogViewer

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
- ルーティング: Caddy で hermes-agents.mini.tumf.dev → localhost:18470
- 監視: logs/webapp.log, /api/health（簡易）

## 12. 将来拡張
- 認証（イントラ限定 Basic や IP ACL）
- リモートホスト管理（SSH/agent-exec）
- 監査ログと操作履歴
