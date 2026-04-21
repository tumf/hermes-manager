# Hermes Manager 要件定義

最終更新: 2026-04-21

## 1. 背景/目的

- ローカルホスト上で多数の Hermes Agent (hermes-agent) を OS サービスマネージャ（macOS: launchd、Linux: systemd）で常駐運用する。
- エージェントごとの HERMES_HOME を標準構造で管理し、設定・メモリ・スキル・実行・ログを Web UI から操作可能にする。
- Hermes 公式 dashboard を単一 Hermes install 向け UI と位置づけ、本製品は複数 agent を配備・運用する control plane に集中する。
- イントラネット運用前提（認証なし）、安全なローカル権限内での制御に限定。

## 2. 用語

- Agent: Hermes gateway を OS サービスマネージャ（macOS: launchd / Linux: systemd）で常駐させる単位。HERMES_HOME は {PROJECT_ROOT}/runtime/agents/{id}。id はシステムが自動生成する `[0-9a-z]{7}` のランダム文字列。
- Global Vars: 全エージェント共通で参照する .env 値。runtime/globals/.env に生成され、dotenvx -f で積み上げる。
- Skill: ~/.agents/skills 以下のスキル（階層ディレクトリ可）。HERMES_HOME/skills へディレクトリをコピーして管理。スキルディレクトリ内に SKILL.md が存在するもののみ選択可能。
- Launchd Label: ai.hermes.gateway.{agent_id}

## 3. スコープ

- in scope:
  - エージェント管理: 追加/削除/コピー、サービス install/start/stop/restart/status（macOS: launchd / Linux: systemd）
  - エージェントの provisioning: templates / partials / memory assets を使った初期化と再利用
  - メモリ/設定ファイルの編集: SOUL.md, memories/MEMORY.md, memories/USER.md, config.yaml
  - 変数管理: HERMES_HOME/.env CRUD、グローバル変数 CRUD と runtime/globals/.env 再生成
  - スキル管理: ~/.agents/skills から {HERMES_HOME}/skills へのディレクトリコピー/削除
  - ログ閲覧: gateway.log / gateway.error.log / errors.log（tail / SSE）
  - Chat / Sessions / Cron は agent 運用・診断に必要な範囲で提供する
  - UI: Agents リスト、Agent 詳細（Memory/Config/Env/Logs）、Globals 管理
- out of scope（当面）:
  - 外部認証/権限管理、外部公開
  - リモートホスト運用
  - 公式 dashboard との feature parity を目的とした単一 agent 向け総合 dashboard 化
  - analytics / cost dashboard を主目的にした製品化

## 4. ユースケース

- UC1: 新しいエージェントを作成し、設定→起動して Telegram 経由で応答させる
- UC2: 稼働中のエージェントのメモリを編集（SOUL.md / memories/MEMORY.md / memories/USER.md）→動作確認
- UC3: .env の変更（モデル/キー差し替え）→再起動
- UC4: スキルをリンク/解除して機能を拡張
- UC5: エラー発生時にログを追跡
- UC6: テンプレートや partial を再利用して役割の異なる agent を短時間で複製・展開する

## 5. 機能要件（FR）

- FR-1 Agents API: GET/POST/DELETE/copy と `PUT /api/agents/{id}/meta`（id 自動生成 `[0-9a-z]{7}`、標準ファイル作成、DB 登録、POST はボディ不要。新規作成と copy は必ず 8642〜8699 の未使用 `apiServerPort` を agent metadata に保持する。`PUT /api/agents/{id}/meta` は name/description/tags 更新時に既存 `apiServerPort` を保持し、当該 agent を `allowedAgents` に含む利用側 agent の generated `SOUL.md` も再 assemble する）
- FR-2 Service API: install/uninstall/start/stop/restart/status（child_process.execFile、stdout/err/code返却。エンドポイントは `/api/launchd` を互換パスとして維持。macOS では launchctl + plist、Linux では systemctl --user + systemd unit を使用。install/start/restart 時に `apiServerPort` 未設定の legacy/misconfigured agent は未使用ポートを補完保存してからサービス定義を再生成する）。fleet UI 向けには `POST /api/launchd/statuses` を追加し、複数 agent の running/pid/code/manager を 1 リクエストで返せる batch status endpoint を提供する。
- FR-3 Files API: SOUL.md / SOUL.src.md / memories/MEMORY.md / memories/USER.md / config.yaml の read/put（YAML 構文検証、原子書き込み、partial mode では SOUL.src.md 保存時に SOUL.md を再生成。MCP サーバ設定を含む Hermes runtime config も `config.yaml` 全体編集で管理する）
- FR-4 Env API: agent .env CRUD、resolved（global+agent マージ）、各変数に `visibility`（plain/secure）を保持し secure は管理表示でマスク
- FR-5 Globals API: CRUD、`visibility`（plain/secure）を保持、secure は管理表示でマスクしつつ runtime/globals/.env は実値で再生成
- FR-6 Skills API: skills tree 取得（~/.agents/skills、階層構造、SKILL.md 検出）、コピー管理（相対パス保持で `{HERMES_HOME}/skills` にディレクトリをコピー/削除、既存コピー検出）
- FR-7 Logs API: 読み取り（tail）、SSE で追尾
- FR-8 Cron API: jobs.json CRUD、pause/resume/run action、output ファイル閲覧（GET/POST/PUT/DELETE、原子書き込み）。`GET /api/cron` は Cron タブの既存ジョブ詳細/編集ビューが必要とする保存済み設定（`name`/`schedule`/`prompt`/`skills`/`deliver`/`repeat`/`model`/`provider`）と runtime metadata（`id`/`state`/`enabled`/`created_at`/`next_run_at`/`last_run_at`/`last_status`/`last_error`）をそのまま返す。`PUT /api/cron` で同じ編集対象フィールドを `agent` + `id` 付きで部分更新できること
- FR-9 UI: Agents 一覧（起動/停止/状態表示/追加/削除/コピー。process-level 情報として Memory を表示し、Hermes バージョンは表示しない。一覧本体の描画は service status の取得に依存せず、`POST /api/launchd/statuses` による非同期 batch hydrate で status を反映し、取得中は loading 表示、取得失敗は Unknown fallback を出す。metadata tags を使ったクライアント側タグ絞り込み UI を提供し、役割 / 環境単位でインベントリを絞れるようにする。絞り込みは OR 条件、0 件時は復旧導線を表示する）、詳細タブ UI（Metadata/Memory/Config/Env/Skills/Delegation/Cron/Logs/Chat。ヘッダー情報エリアに Hermes バージョンを表示し、未取得時は `--` を表示）。MCP サーバ設定は Config タブの `config.yaml` 編集で扱う。Chat / Logs / Cron / Skills / Env / Config は agent 運用と診断を支援する範囲で提供し、単一 agent 向け総合 dashboard の feature parity は要件としない。Chat タブはセッション一覧の上に検索ボックスを配置し、`state.db` の FTS5 インデックスを使用した per-agent メッセージ全文検索を提供する（`GET /api/agents/{id}/sessions/search?q=...`）。検索結果からセッションを開き、該当メッセージのコンテキストを確認できる。App shell はデスクトップで collapsible sticky sidebar を提供する。Globals UI
- FR-10 Templates API: テンプレート CRUD（GET/POST/PUT/DELETE）、template name + file path の組み合わせで一意。対象ファイルは `SOUL.md` / `memories/MEMORY.md` / `memories/USER.md` / `config.yaml`。エージェント作成時のテンプレート選択、default テンプレートへのフォールバック、既存ファイルからの Save as Template を提供する
- FR-11 Partials API: 共有 partial CRUD（`/api/partials`）、`runtime/partials/{name}.md` 保存、`usedBy` 逆引き、利用中削除の 409 拒否、partial 更新時の参照 agent `SOUL.md` 再生成
- FR-12 Memory UI partial mode: agent ごとの partial mode 有効化（`SOUL.md`→`SOUL.src.md`）、partial 挿入、assembled `SOUL.md` の read-only 確認
- FR-14 Dispatch API: per-agent managed dispatch policy CRUD（`GET/PUT /api/agents/{id}/delegation`）。canonical storage は `dispatch.json`、`dispatch.json` 不在時は legacy `delegation.json` を読み取りフォールバック。allowedAgents/maxHop を保存し、cycle 検出で reject。policy 保存時に managed dispatch skill を自動 equip/unequip し、`SOUL.md` に machine-generated subagent YAML block を再生成。生成 guidance は dispatch-first wording を使用し、built-in `delegate_task` を別機構として扱い、listed managed subagent が明確に適合する場合は dispatch を優先し、child が完了しない場合の parent 再 ownership セマンティクスを明記。`POST /api/agents/{id}/dispatch` で source agent policy を検証後 target agent api_server に proxy dispatch
- FR-13 UI ローカライゼーション: `ja`, `en`, `zh-CN`, `es`, `pt-BR`, `vi`, `ko`, `ru`, `fr`, `de` の 10 言語をサポート。共有 app shell にLanguage Switcherを配置し、選択した locale を localStorage に永続化。`document.documentElement.lang` を有効 locale に同期。翻訳キー未定義時はデフォルト locale にフォールバック。operator 生成コンテンツ（SOUL.md、メモリ、ログ、チャット転写等）は翻訳対象外
- FR-15 App Shell ergonomics: デスクトップの左サイドバーは viewport 内に固定され、右メイン領域だけが独立スクロールする。サイドバーは icon-only rail へ折りたため、折りたたみ状態は localStorage に永続化される。モバイルでは既存の Sheet ベースメニューを維持する

## 6. 非機能要件（NFR）

- NFR-1 パフォーマンス: 一覧 100 agents 程度で体感遅延 < 200ms（キャッシュ/並列取得）
- NFR-2 安全性: パス正規化と zod で入力検証、execFile でシェルインジェクション回避
- NFR-3 可用性: アプリ自体も OS サービスマネージャ（macOS: launchd / Linux: systemd）で常駐、障害復旧は再起動で完結
- NFR-4 運用性: ログファイルは runtime/logs および agent logs/ に分離、restic バックアップ対象
- NFR-5 テスト容易性: API は関数分離しユニット可能、UI はコンポーネント単位でテスト
- NFR-6 製品一貫性: 新機能は multi-agent operations / provisioning / lifecycle / deployment safety のいずれかを明確に改善するものを優先し、公式 dashboard との feature parity を目的に追加しない

## 7. セキュリティ/信頼境界

- イントラネットのみ。外部公開禁止。Caddy は mini 内部ドメインのみ。
- ファイル操作は {PROJECT_ROOT} と HERMES_HOME 配下に限定。パス走査保護。
- サービスマネージャ操作（launchctl / systemctl）は child_process.execFile のみ使用。

## 8. 運用要件

- データソース: `runtime/` ディレクトリ構造を唯一のソース・オブ・トゥルースとして運用する（SQLite は使用しない）。
- バックアップ: `runtime/agents/`、`runtime/globals/`、`runtime/logs/` を resticprofile に追加推奨。
- 監視: 最低限 `runtime/logs/webapp.log` / `runtime/logs/webapp.error.log` の死活確認、必要に応じて `/api/health` の ping を行う。
- 既存環境移行: 既存運用手順で `runtime/` の必須ディレクトリ/ファイル（agents・globals・logs）を作成し、構成不整合がないことを起動前に検証する。

## 9. 制約/前提

- Node >= 20, macOS launchd または Linux systemd 環境、dotenvx インストール済
- HERMES_HOME 構造: runtime/agents/{id}/{SOUL.md, config.yaml, .env, logs/, memories/MEMORY.md, memories/USER.md}

## 10. 受け入れ基準（抜粋）

- API 群は openspec/changes の acceptance と整合
- UI から UC1〜UC5 が手戻りなく実現

## 11. API 高レベル一覧

- /api/agents, /api/agents/{id}/delegation, /api/agents/{id}/dispatch, /api/launchd, /api/launchd/statuses, /api/files, /api/partials, /api/env, /api/env/resolved, /api/globals, /api/skills/\*, /api/logs, /api/logs/stream, /api/cron, /api/cron/action, /api/cron/output, /api/templates

## 12. UI 概要

- / Agents 一覧（Add Agent ダイアログに app-managed file のテンプレート選択を含む）
- /globals グローバル変数
- /templates テンプレート管理（テンプレート名と対象ファイルごとの追加/編集/削除）
- /partials 共有 partial 管理（一覧・作成・編集・削除・usedBy 表示）
- /agents/[id] Metadata / Memory / Config / Env / Skills / Cron / Chat / Logs タブ（Memory タブは partial mode 有効化、SOUL.src.md 編集、assembled SOUL.md 確認、Save as Template ボタン付き。MCP サーバ設定は Config タブの `config.yaml` 編集で扱う）
- 全ページ共通: Language Switcher による多言語 UI 切替（10 言語対応）
