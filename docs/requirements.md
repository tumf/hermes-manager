# Hermes Agents WebApp 要件定義

最終更新: 2026-03-27

## 1. 背景/目的

- mini 上で多数の Hermes Agent (hermes-agent) を launchd で常駐運用する。
- エージェントごとの HERMES_HOME を標準構造で管理し、設定・メモリ・スキル・実行・ログを Web UI から操作可能にする。
- イントラネット運用前提（認証なし）、安全なローカル権限内での制御に限定。

## 2. 用語

- Agent: Hermes gateway を launchd で常駐させる単位。HERMES_HOME は {PROJECT_ROOT}/runtime/agents/{name}。
- Global Vars: 全エージェント共通で参照する .env 値。runtime/globals/.env に生成され、dotenvx -f で積み上げる。
- Skill: ~/.hermes/skills 以下のスキル（階層ディレクトリ可）。HERMES_HOME/skills へ symlink 管理。
- Launchd Label: ai.hermes.gateway.{agent_name}

## 3. スコープ

- in scope:
  - エージェント管理: 追加/削除/コピー、launchd install/start/stop/status
  - メモリ/設定ファイルの編集: AGENTS.md, SOUL.md, config.yaml
  - 変数管理: HERMES_HOME/.env CRUD、グローバル変数 CRUD と runtime/globals/.env 再生成
  - スキル管理: ~/.hermes/skills → {HERMES_HOME}/skills への symlink
  - ログ閲覧: gateway.log / gateway.error.log / errors.log（tail / SSE）
  - UI: Agents リスト、Agent 詳細（Memory/Config/Env/Skills/Logs）、Globals 管理
- out of scope（当面）:
  - 外部認証/権限管理、外部公開
  - リモートホスト運用

## 4. ユースケース

- UC1: 新しいエージェントを作成し、設定→起動して Telegram 経由で応答させる
- UC2: 稼働中のエージェントのメモリを編集（AGENTS.md/SOUL.md）→動作確認
- UC3: .env の変更（モデル/キー差し替え）→再起動
- UC4: スキルをリンク/解除して機能を拡張
- UC5: エラー発生時にログを追跡

## 5. 機能要件（FR）

- FR-1 Agents API: GET/POST/DELETE/copy（name 検証、標準ファイル作成、DB 登録）
- FR-2 Launchd API: install/uninstall/start/stop/status（child_process.execFile、stdout/err/code返却）
- FR-3 Files API: AGENTS.md / SOUL.md / config.yaml の read/put（YAML 構文検証、原子書き込み）
- FR-4 Env API: agent .env CRUD、resolved（global+agent マージ）
- FR-5 Globals API: CRUD、書き換え時に runtime/globals/.env を再生成
- FR-6 Skills API: skills tree 取得、symlink 管理（リンク/解除、DB 記録）
- FR-7 Logs API: 読み取り（tail）、SSE で追尾
- FR-8 UI: Agents 一覧（起動/停止/状態表示/追加/削除/コピー）、詳細タブ UI、Globals UI

## 6. 非機能要件（NFR）

- NFR-1 パフォーマンス: 一覧 100 agents 程度で体感遅延 < 200ms（キャッシュ/並列取得）
- NFR-2 安全性: パス正規化と zod で入力検証、execFile でシェルインジェクション回避
- NFR-3 可用性: アプリ自体も launchd 常駐、障害復旧は再起動で完結
- NFR-4 運用性: ログファイルは runtime/logs および agent logs/ に分離、restic バックアップ対象
- NFR-5 テスト容易性: API は関数分離しユニット可能、UI はコンポーネント単位でテスト

## 7. セキュリティ/信頼境界

- イントラネットのみ。外部公開禁止。Caddy は mini 内部ドメインのみ。
- ファイル操作は {PROJECT_ROOT} と HERMES_HOME 配下に限定。パス走査保護。
- launchctl 操作は child_process.execFile のみ使用。

## 8. 運用要件

- DB: ./runtime/data/app.db（better-sqlite3）。drizzle-kit によりマイグレート。
- バックアップ: runtime/data/ と runtime/agents/ は resticprofile に追加推奨。
- 監視: 最低限 runtime/logs/webapp.log の死活、必要に応じてエンドポイント ping。
- 既存環境移行: `npm run migrate:runtime` を実行し、必要に応じて `--dry-run` で事前検証する。

## 9. 制約/前提

- Node >= 20, macOS launchd 環境、dotenvx インストール済
- HERMES_HOME 構造: runtime/agents/{name}/{AGENTS.md, SOUL.md, config.yaml, .env, logs/}

## 10. 受け入れ基準（抜粋）

- API 群は openspec/changes の acceptance と整合
- UI から UC1〜UC5 が手戻りなく実現

## 11. API 高レベル一覧

- /api/agents, /api/launchd, /api/files, /api/env, /api/env/resolved, /api/globals, /api/skills/\*, /api/logs, /api/logs/stream

## 12. UI 概要

- / Agents 一覧
- /globals グローバル変数
- /agents/[n] Memory / Config / Env / Skills / Logs タブ
