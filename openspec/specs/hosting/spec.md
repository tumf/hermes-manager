# Hosting Setup Spec

## Requirements

### Requirement: launchd service keeps webapp running persistently

The project MUST include a launchd plist that starts the webapp automatically at
login and restarts it if it exits, using PORT=18470 and NODE_ENV=production.

#### Scenario: Service starts on login

Given the plist is installed via launchctl bootstrap,
When the user logs in,
Then the webapp process starts on port 18470 automatically.

#### Scenario: Log files written to correct paths

Given the plist is loaded and the webapp is running,
When the process writes to stdout or stderr,
Then output appears in runtime/logs/webapp.log and runtime/logs/webapp.error.log respectively.

### Requirement: Caddy snippet routes public subdomain

The project MUST include a Caddy configuration snippet that routes
hermes-agents.mini.tumf.dev to localhost:18470 with HTTPS termination.

#### Scenario: Public domain resolves to webapp

Given the snippet is included in the active Caddyfile and Caddy is reloaded,
When an HTTPS request is made to hermes-agents.mini.tumf.dev,
Then Caddy reverse proxies to localhost:18470.

### Requirement: Production start script runs server on the fixed port

The `npm run start:prod` script MUST start the Next.js server on `PORT=18470`
using the filesystem-based runtime layout already prepared for the application.
It MUST NOT require or imply database migrations from a previous architecture.

#### Scenario: Fresh runtime starts without database setup

Given the repository is cloned and dependencies are installed,
And the runtime directories are prepared via `.wt/setup` or equivalent,
When `npm run start:prod` is executed,
Then the Next.js server starts on `PORT=18470` without any database migration step.

#### Scenario: Hosting docs match production start behavior

Given a maintainer reads the hosting documentation,
When they review the production start instructions,
Then the docs describe the filesystem-based runtime behavior accurately
And they do not mention database migrations on startup.

### Requirement: persistent local service hosting keeps webapp running

The project MUST include local-service hosting artifacts that keep the webapp running persistently on supported operating systems.

- On macOS, the repository must provide a launchd plist that starts the webapp automatically at login and restarts it if it exits, using `PORT=18470` and `NODE_ENV=production`.
- On Linux, the repository must provide a systemd service definition and installation instructions that start the webapp persistently with the same port and environment semantics.

#### Scenario: macos-hosting-service-starts-on-login

**Given**: the macOS launchd plist is installed via `launchctl bootstrap`
**When**: the user logs in
**Then**: the webapp process starts on port 18470 automatically

#### Scenario: linux-hosting-service-starts-via-systemd

**Given**: the Linux systemd unit is installed according to the repository instructions
**When**: the operator enables and starts the service
**Then**: the webapp process starts on port 18470 using `NODE_ENV=production`

#### Scenario: service-logs-are-documented-per-platform

**Given**: a supported hosting artifact is installed and the webapp is running
**When**: the process writes stdout or stderr
**Then**: the repository documentation identifies the corresponding log destinations for that platform

### Requirement: Production start script runs server on the fixed port

`npm run start:prod` は、現在のファイルシステムベース構成に必要な前提ディレクトリとログ出力先を利用して Next.js サーバーを `PORT=18470` で起動しなければならない。旧アーキテクチャ由来のデータベース migration 前提を要求してはならない。

#### Scenario: Fresh runtime starts without database setup

**Given**: リポジトリを新規 clone し、必要な Node 依存関係をインストール済みである
**And**: `runtime/logs/` などの実行時ディレクトリは存在しないか空である
**When**: `.wt/setup` の後に `npm run start:prod` を実行する
**Then**: データベース migration を要求せずに Next.js サーバーが `PORT=18470` で起動する

#### Scenario: Hosting documentation matches production start behavior

**Given**: メンテナーが `hosting/README.md` と hosting spec を確認している
**When**: `start:prod` の説明を読む
**Then**: 説明は filesystem-based runtime に整合し、DB migration の記述を含まない

### Requirement: Caddy snippet routes public subdomain

プロジェクトは、`hermes-manager.mini.tumf.dev` を localhost:18470 に HTTPS termination 付きで reverse proxy する Caddy 設定スニペットと運用文書を提供しなければならない。旧 URL `hermes-agents.mini.tumf.dev` を正準公開 URL として案内してはならない。

#### Scenario: Public domain resolves to renamed webapp endpoint

**Given**: snippet が active Caddyfile に含まれ、Caddy が reload 済みである
**When**: `https://hermes-manager.mini.tumf.dev` に HTTPS リクエストする
**Then**: Caddy は localhost:18470 に reverse proxy する

### Requirement: persistent local service hosting keeps webapp running

プロジェクトは、`Hermes Manager` を永続起動する local-service hosting artifacts を提供しなければならない。macOS と Linux の運用文書・artifact 名・service label は rename 後の名称に整合し、旧識別子 `ai.hermes.agents-webapp` を正準として案内してはならない。

#### Scenario: Hosting artifacts use renamed service identity

**Given**: オペレーターが macOS または Linux 向け hosting artifact と手順を参照している
**When**: launchd plist / systemd unit 名、service label、install commands を確認する
**Then**: artifact 名と service identity は `Hermes Manager` / `hermes-manager` に整合した名称を使う
**And**: 旧 service label `ai.hermes.agents-webapp` は正準手順に残らない

### Requirement: persistent local service hosting keeps webapp running

プロジェクトは、`Hermes Manager` を永続起動する macOS hosting artifact と手順を、rename 後の実 repo 配置・service identity・log 出力先に整合した状態で提供しなければならない。

- macOS 向け launchd plist は、現行の正準 repo 配置を `WorkingDirectory` に使わなければならない。
- macOS 向け launchd plist の stdout / stderr 出力先は、現行 repo 配置配下の `runtime/logs/` を指さなければならない。
- macOS 向け hosting 文書は、初回 service 登録に `launchctl bootstrap` を使い、既登録 service の restart / reload に `launchctl kickstart -kp` を使う運用境界を区別して案内しなければならない。

#### Scenario: macos-hosting-artifact-uses-current-repo-paths

**Given**: オペレーターが `hosting/ai.hermes.manager.plist` を参照している
**When**: `WorkingDirectory` と `StandardOutPath` / `StandardErrorPath` を確認する
**Then**: それらは rename 後の現行 repo 配置を基準にしている
**And**: log 出力先は現行 repo 配置配下の `runtime/logs/webapp.log` と `runtime/logs/webapp.error.log` を指す

#### Scenario: macos-hosting-docs-separate-bootstrap-from-reload

**Given**: オペレーターが macOS 向け hosting 手順を読んでいる
**When**: service の install と再起動手順を確認する
**Then**: 初回登録には `launchctl bootstrap` が案内される
**And**: 既登録 service の restart / reload には `launchctl kickstart -kp` が案内される
