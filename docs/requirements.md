# Hermes Agents WebApp 要件定義

最終更新: 2026-04-03

## 1. 背景/目的

- mini 上で多数の Hermes Agent (hermes-agent) を launchd で常駐運用する。
- エージェントごとの HERMES_HOME を標準構造で管理し、設定・メモリ・スキル・実行・ログを Web UI から操作可能にする。
- イントラネット運用前提（認証なし）、安全なローカル権限内での制御に限定。

## 2. 用語

- Agent: Hermes gateway を launchd で常駐させる単位。HERMES_HOME は {PROJECT_ROOT}/runtime/agents/{id}。id はシステムが自動生成する `[0-9a-z]{7}` のランダム文字列。
- Global Vars: 全エージェント共通で参照する .env 値。runtime/globals/.env に生成され、dotenvx -f で積み上げる。
- Skill: ~/.agents/skills 以下のスキル（階層ディレクトリ可）。HERMES_HOME/skills へディレクトリをコピーして管理。スキルディレクトリ内に SKILL.md が存在するもののみ選択可能。
- Launchd Label: ai.hermes.gateway.{agent_id}

## 3. スコープ

- in scope:
  - エージェント管理: 追加/削除/コピー、launchd install/start/stop/status
  - メモリ/設定ファイルの編集: SOUL.md, memories/MEMORY.md, memories/USER.md, config.yaml
  - 変数管理: HERMES_HOME/.env CRUD、グローバル変数 CRUD と runtime/globals/.env 再生成
  - スキル管理: ~/.agents/skills から {HERMES_HOME}/skills へのディレクトリコピー/削除
  - ログ閲覧: gateway.log / gateway.error.log / errors.log（tail / SSE）
  - UI: Agents リスト、Agent 詳細（Memory/Config/Env/Logs）、Globals 管理
- out of scope（当面）:
  - 外部認証/権限管理、外部公開
  - リモートホスト運用

## 4. ユースケース

- UC1: 新しいエージェントを作成し、設定→起動して Telegram 経由で応答させる
- UC2: 稼働中のエージェントのメモリを編集（SOUL.md / memories/MEMORY.md / memories/USER.md）→動作確認
- UC3: .env の変更（モデル/キー差し替え）→再起動
- UC4: スキルをリンク/解除して機能を拡張
- UC5: エラー発生時にログを追跡

## 5. 機能要件（FR）

- FR-1 Agents API: GET/POST/DELETE/copy（id 自動生成 `[0-9a-z]{7}`、標準ファイル作成、DB 登録、POST はボディ不要。新規作成と copy は必ず 8642〜8699 の未使用 `apiServerPort` を agent metadata に保持する）
- FR-2 Launchd API: install/uninstall/start/stop/status（child_process.execFile、stdout/err/code返却。install/start/restart 時に `apiServerPort` 未設定の legacy/misconfigured agent は未使用ポートを補完保存してから plist を再生成する）
- FR-3 Files API: SOUL.md / SOUL.src.md / memories/MEMORY.md / memories/USER.md / config.yaml の read/put（YAML 構文検証、原子書き込み、partial mode では SOUL.src.md 保存時に SOUL.md を再生成）
- FR-4 Env API: agent .env CRUD、resolved（global+agent マージ）、各変数に `visibility`（plain/secure）を保持し secure は管理表示でマスク
- FR-5 Globals API: CRUD、`visibility`（plain/secure）を保持、secure は管理表示でマスクしつつ runtime/globals/.env は実値で再生成
- FR-6 Skills API: skills tree 取得（~/.agents/skills、階層構造、SKILL.md 検出）、コピー管理（相対パス保持で `{HERMES_HOME}/skills` にディレクトリをコピー/削除、既存コピー検出）
- FR-7 Logs API: 読み取り（tail）、SSE で追尾
- FR-8 Cron API: jobs.json CRUD、pause/resume/run action、output ファイル閲覧（GET/POST/PUT/DELETE、原子書き込み）
- FR-9 UI: Agents 一覧（起動/停止/状態表示/追加/削除/コピー。process-level 情報として Memory を表示し、Hermes バージョンは表示しない）、詳細タブ UI（Metadata/Memory/Config/Env/Cron/Logs。ヘッダー情報エリアに Hermes バージョンを表示し、未取得時は `--` を表示）、Globals UI
- FR-10 Templates API: テンプレート CRUD（GET/POST/PUT/DELETE）、fileType + name で UNIQUE 制約。エージェント作成時のテンプレート選択、default テンプレートへのフォールバック、既存ファイルからの Save as Template
- FR-11 Partials API: 共有 partial CRUD（`/api/partials`）、`runtime/partials/{name}.md` 保存、`usedBy` 逆引き、利用中削除の 409 拒否、partial 更新時の参照 agent `SOUL.md` 再生成
- FR-12 Memory UI partial mode: agent ごとの partial mode 有効化（`SOUL.md`→`SOUL.src.md`）、partial 挿入、assembled `SOUL.md` の read-only 確認
- FR-13 UI ローカライゼーション: `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, `de` の 10 言語をサポート。共有 app shell にLanguage Switcherを配置し、選択した locale を localStorage に永続化。`document.documentElement.lang` を有効 locale に同期。翻訳キー未定義時はデフォルト locale にフォールバック。operator 生成コンテンツ（SOUL.md、メモリ、ログ、チャット転写等）は翻訳対象外

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

- データソース: `runtime/` ディレクトリ構造を唯一のソース・オブ・トゥルースとして運用する（SQLite は使用しない）。
- バックアップ: `runtime/agents/`、`runtime/globals/`、`runtime/logs/` を resticprofile に追加推奨。
- 監視: 最低限 `runtime/logs/webapp.log` / `runtime/logs/webapp.error.log` の死活確認、必要に応じて `/api/health` の ping を行う。
- 既存環境移行: 既存運用手順で `runtime/` の必須ディレクトリ/ファイル（agents・globals・logs）を作成し、構成不整合がないことを起動前に検証する。

## 9. 制約/前提

- Node >= 20, macOS launchd 環境、dotenvx インストール済
- HERMES_HOME 構造: runtime/agents/{id}/{SOUL.md, config.yaml, .env, logs/, memories/MEMORY.md, memories/USER.md}

## 10. 受け入れ基準（抜粋）

- API 群は openspec/changes の acceptance と整合
- UI から UC1〜UC5 が手戻りなく実現

## 11. API 高レベル一覧

- /api/agents, /api/launchd, /api/files, /api/partials, /api/env, /api/env/resolved, /api/globals, /api/skills/\*, /api/logs, /api/logs/stream, /api/cron, /api/cron/action, /api/cron/output, /api/templates

## 12. UI 概要

- / Agents 一覧（Add Agent ダイアログにテンプレート選択を含む）
- /globals グローバル変数
- /templates テンプレート管理（fileType 別グループ、追加/編集/削除）
- /partials 共有 partial 管理（一覧・作成・編集・削除・usedBy 表示）
- /agents/[id] Metadata / Memory / Config / Env / Skills / Cron / Chat / Logs タブ（Memory タブは partial mode 有効化、SOUL.src.md 編集、assembled SOUL.md 確認、Save as Template ボタン付き）
- 全ページ共通: Language Switcher による多言語 UI 切替（10 言語対応）
